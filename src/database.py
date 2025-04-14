from sqlalchemy.orm import Session
from sqlalchemy import select
from src.models import User, Object, CLD, VariableCLD
from werkzeug.security import generate_password_hash, check_password_hash


def register_user(db: Session, name, email, password):
    hashed_password = generate_password_hash(password)
    new_user = User(name=name, email=email, password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def login_user(db: Session, email, password):
    user = db.scalar(select(User).where(User.email == email))
    if user and check_password_hash(user.password, password):
        return user
    return None


def create_object(db: Session, user_id, name, description):
    new_object = Object(user_id=user_id, name=name, description=description)
    db.add(new_object)
    db.commit()
    db.refresh(new_object)
    return new_object


def get_user_objects(db: Session, user_id):
    return db.scalars(select(Object).where(Object.user_id == user_id)).all()


def get_user_by_email(db: Session, email):
    return db.scalar(select(User).where(User.email == email))


def get_user_by_id(db: Session, user_id):
    return db.scalar(select(User).where(User.id == user_id))


def get_user_clds(db: Session, user_id):
    return db.query(CLD).filter(CLD.user_id == user_id).all()


def get_all_variables(db: Session):
    return db.query(Object).all()


def get_cld_by_user(db: Session, cld_id, user_id):
    return db.query(CLD).filter(CLD.id == cld_id, CLD.user_id == user_id).first()


def get_variable_clds_by_cld(db: Session, cld_id):
    return db.query(VariableCLD).filter_by(cld_id=cld_id).all()


def create_cld(db: Session, user_id: int, name: str, date, description: str):
    new_cld = CLD(user_id=user_id, name=name, date=date, description=description)
    db.add(new_cld)
    db.commit()
    db.refresh(new_cld)
    return new_cld


def create_variable(db: Session, name: str):
    new_variable = Object(name=name)
    db.add(new_variable)
    db.commit()
    db.refresh(new_variable)
    return new_variable


def create_variable_cld(db: Session, cld_id: int, from_variable_id: int, to_variable_id: int, rel_type):
    new_rel = VariableCLD(
        cld_id=cld_id,
        from_variable_id=from_variable_id,
        to_variable_id=to_variable_id,
        type=rel_type
    )
    db.add(new_rel)
    db.commit()
    db.refresh(new_rel)
    return new_rel
