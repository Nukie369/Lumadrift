import os
import tempfile
import unittest
from pathlib import Path
from run_browser_check import run, preflight

class RunnerTests(unittest.TestCase):
    def check(self, code, expected):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'fake-chromium'
            path.write_text('#!/usr/bin/env python3\n'+code)
            path.chmod(0o755)
            self.assertEqual(run(str(path),timeout=2)['status'],expected)
    def test_pass(self):
        self.check('print(\'<output id="result">PASS: constructed</output>\')','PASS')
    def test_fail(self):
        self.check('print(\'<output id="result">FAIL: shards wrong</output>\')','FAIL')
    def test_timeout(self):
        self.check('import time; time.sleep(4)','TIMEOUT')
    def test_timeout_kills_descendant_process(self):
        with tempfile.TemporaryDirectory() as d:
            marker_file=Path(d)/'child-survived'
            path=Path(d)/'fake-chromium'
            child = f"import time,pathlib; time.sleep(1); pathlib.Path({str(marker_file)!r}).write_text('alive')"
            path.write_text(f"#!/usr/bin/env python3\nimport subprocess,sys,time\nsubprocess.Popen([sys.executable, '-c', {child!r}])\ntime.sleep(5)\n")
            path.chmod(0o755)
            self.assertEqual(run(str(path),timeout=.25)['status'],'TIMEOUT')
            import time
            time.sleep(1.2)
            self.assertFalse(marker_file.exists(), 'timed-out browser left a running child')
    def test_preflight_success(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'fake-chromium'
            path.write_text('#!/usr/bin/env python3\nprint("<html><body></body></html>")\n')
            path.chmod(0o755)
            self.assertEqual(preflight(str(path),2)['status'],'PASS')
    def test_preflight_timeout(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'fake-chromium'
            path.write_text('#!/usr/bin/env python3\nimport time; time.sleep(3)\n')
            path.chmod(0o755)
            self.assertEqual(preflight(str(path),.2)['status'],'TIMEOUT')
    def test_missing_browser(self):
        self.assertEqual(run('/missing/chromium')['status'],'ERROR')

if __name__=='__main__':unittest.main()
