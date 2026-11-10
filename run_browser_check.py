#!/usr/bin/env python3
"""Bounded headless Chromium smoke test; exits nonzero on timeout or failed assertions."""
import argparse
import json
import re
import subprocess
import os
import signal
import tempfile
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def run(browser='chromium', timeout=20, page=None):
    page = page or (ROOT / 'browser-colony-check.html').as_uri()
    # Isolate browser profile and kill the entire process group on timeout.
    with tempfile.TemporaryDirectory(prefix='luma-chromium-') as profile:
        cmd = [browser, '--headless', '--no-sandbox', '--disable-gpu',
               '--disable-dev-shm-usage', '--disable-background-networking',
               '--no-first-run', '--disable-extensions',
               '--user-data-dir=' + profile,
               '--virtual-time-budget=14000', '--dump-dom', page]
        try:
            p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                 text=True, start_new_session=True)
            try:
                stdout, stderr = p.communicate(timeout=timeout)
            except subprocess.TimeoutExpired:
                os.killpg(p.pid, signal.SIGKILL)
                stdout, stderr = p.communicate()
                return {'status':'TIMEOUT','seconds':timeout,
                        'detail':'Chromium process group exceeded wall-clock deadline',
                        'stderr_tail':stderr[-500:]}
        except OSError as exc:
            return {'status':'ERROR','detail':str(exc)}
    class Completed: pass
    completed = Completed()
    completed.stdout, completed.stderr, completed.returncode = stdout, stderr, p.returncode
    p = completed
    match = re.search(r'<output\b[^>]*id="result"[^>]*>(.*?)</output>', p.stdout, re.S)
    result = re.sub(r'<[^>]*>', '', match.group(1)).strip() if match else ''
    if p.returncode != 0 and not result:
        return {'status':'ERROR','detail':'Chromium exited before producing a test result',
                'exit_code':p.returncode,'stderr_tail':p.stderr[-500:]}
    if result.startswith('PASS:'):
        return {'status':'PASS','detail':result}
    return {'status':'FAIL','detail':result or 'No result output in Chromium DOM',
            'exit_code':p.returncode,'stderr_tail':p.stderr[-500:]}


def preflight(browser='chromium', timeout=8):
    """Distinguish browser process startup failure from gameplay harness failure."""
    with tempfile.TemporaryDirectory(prefix='luma-preflight-') as profile:
        cmd=[browser,'--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
             '--no-first-run','--user-data-dir='+profile,'--dump-dom','about:blank']
        try:
            p=subprocess.Popen(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
                               text=True,start_new_session=True)
            try: out,err=p.communicate(timeout=timeout)
            except subprocess.TimeoutExpired:
                os.killpg(p.pid,signal.SIGKILL)
                _,err=p.communicate()
                return {'status':'TIMEOUT','detail':'Chromium could not complete even about:blank; browser environment blocked, not a gameplay assertion', 'stderr_tail':err[-500:]}
        except OSError as exc: return {'status':'ERROR','detail':str(exc)}
    if p.returncode==0 and '<html' in out.lower():
        return {'status':'PASS','detail':'Chromium launched and rendered about:blank'}
    return {'status':'FAIL','detail':'Chromium startup did not produce HTML', 'exit_code':p.returncode,'stderr_tail':err[-500:]}

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--browser',default='chromium')
    parser.add_argument('--timeout',type=float,default=20)
    parser.add_argument('--preflight',action='store_true',help='Check browser startup independently of gameplay')
    args=parser.parse_args()
    result=run(args.browser,args.timeout,page='about:blank' if args.preflight else None) if not args.preflight else preflight(args.browser,args.timeout)
    print(json.dumps(result))
    sys.exit(0 if result['status']=='PASS' else 1)
