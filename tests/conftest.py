import os
import pytest
from pathlib import Path

@pytest.fixture(autouse=True)
def setup_env():
    # ???? ??? insta-place-gcp.json? ?? ?? ??? ??
    root_dir = Path(__file__).resolve().parent.parent
    sa_path = root_dir / "insta-place-gcp.json"
    if sa_path.exists():
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(sa_path)
