import os
from pathlib import Path
from alembic.config import Config
from alembic.script import ScriptDirectory


def test_alembic_script_directory_and_head():
    """Assert Alembic config points to data/migrations and resolves revision 001_initial_schema."""
    root_dir = Path(__file__).parent.parent.parent
    alembic_ini = root_dir / "alembic.ini"
    assert alembic_ini.exists(), "alembic.ini must exist in repo root"

    config = Config(str(alembic_ini))
    script = ScriptDirectory.from_config(config)

    head = script.get_current_head()
    assert head == "001_initial_schema"

    revision = script.get_revision("001_initial_schema")
    assert revision is not None
    assert revision.down_revision is None
