from datetime import date

import bcrypt


def password_from_dob(dob: date) -> str:
    return dob.strftime("%d%m%Y")


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())
