"""Compatibility entry point for the superseding ring-layer reset."""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name('verify_thz1_cleanup_ring_layer.py')),run_name='__main__')
