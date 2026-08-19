import gzip
import logging
import os
import shutil
from logging.handlers import TimedRotatingFileHandler

LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

_FORMAT = "[%(label)s] %(asctime)s %(levelname)s: %(message)s"
_DATEFMT = "%Y-%m-%d %H:%M:%S"


def _gzip_namer(name: str) -> str:
    return name + ".gz"


def _gzip_rotator(source: str, dest: str) -> None:
    with open(source, "rb") as f_in, gzip.open(dest, "wb") as f_out:
        shutil.copyfileobj(f_in, f_out)
    os.remove(source)


class _LabelFilter(logging.Filter):
    def __init__(self, label: str):
        super().__init__()
        self.label = label

    def filter(self, record: logging.LogRecord) -> bool:
        record.label = self.label
        return True


def _make_file_handler(
    filename: str, backup_count: int, level: int = logging.NOTSET
) -> TimedRotatingFileHandler:
    handler = TimedRotatingFileHandler(
        os.path.join(LOG_DIR, filename), when="midnight", backupCount=backup_count, encoding="utf-8"
    )
    # daily rotation only — no size-cap trigger, unlike winston-daily-rotate-file
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter(_FORMAT, datefmt=_DATEFMT))
    handler.namer = _gzip_namer
    handler.rotator = _gzip_rotator
    return handler


_console_handler = logging.StreamHandler()
_console_handler.setFormatter(logging.Formatter(_FORMAT, datefmt=_DATEFMT))

# child loggers attach only a label filter, not their own handlers
_combined_file_handler = _make_file_handler("combined.log", backup_count=14)
_error_file_handler = _make_file_handler("error.log", backup_count=30, level=logging.ERROR)

_base_logger = logging.getLogger("learning_management")
_base_logger.setLevel(logging.DEBUG)
_base_logger.addHandler(_console_handler)
_base_logger.addHandler(_combined_file_handler)
_base_logger.addHandler(_error_file_handler)
_base_logger.propagate = False


def get_logger(label: str) -> logging.Logger:
    logger = _base_logger.getChild(label)
    if not any(isinstance(f, _LabelFilter) for f in logger.filters):
        logger.addFilter(_LabelFilter(label))
    return logger
