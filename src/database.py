from sqlalchemy.orm import Session
from sqlalchemy import select
from src.models import User, Variable, CLD, Relationship, RelationshipType
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


def create_variable(db: Session, user_id, name, description):
    new_variable = Variable(user_id=user_id, name=name, description=description)
    db.add(new_variable)
    db.commit()
    db.refresh(new_variable)
    return new_variable


def get_user_variables(db: Session, user_id):
    return db.scalars(select(Variable).where(Variable.user_id == user_id)).all()


def get_user_by_email(db: Session, email):
    return db.scalar(select(User).where(User.email == email))


def get_user_by_id(db: Session, user_id):
    return db.scalar(select(User).where(User.id == user_id))


def get_user_clds(db: Session, user_id):
    return db.query(CLD).filter(CLD.user_id == user_id).all()


def get_all_variables(db: Session):
    return db.query(Variable).all()


def get_cld_by_user(db: Session, cld_id, user_id):
    return db.query(CLD).filter(CLD.id == cld_id, CLD.user_id == user_id).first()


def get_relationships_by_cld(db: Session, cld_id):
    return db.query(Relationship).filter_by(cld_id=cld_id).all()


def create_cld(db: Session, user_id: str, name: str, date, description: str):
    new_cld = CLD(user_id=user_id, name=name, date=date, description=description)
    db.add(new_cld)
    db.commit()
    db.refresh(new_cld)
    return new_cld


def create_relationship(db: Session, cld_id: str, source_id: str, target_id: str, rel_type: RelationshipType):
    new_rel = Relationship(
        cld_id=cld_id,
        source_id=source_id,
        target_id=target_id,
        type=rel_type
    )
    db.add(new_rel)
    db.commit()
    db.refresh(new_rel)
    return new_rel


def update_variable(db: Session, variable_id: str, user_id: str, name: str = None, description: str = None):
    variable = db.query(Variable).filter(Variable.id == variable_id, Variable.user_id == user_id).first()
    if variable:
        if name is not None:
            variable.name = name
        if description is not None:
            variable.description = description
        db.commit()
        db.refresh(variable)
    return variable


def delete_variable(db: Session, variable_id: str, user_id: str):
    variable = db.query(Variable).filter(Variable.id == variable_id, Variable.user_id == user_id).first()
    if variable:
        db.delete(variable)
        db.commit()
        return True
    return False


def update_cld(db: Session, cld_id: str, user_id: str, name: str = None, description: str = None, date = None):
    cld = db.query(CLD).filter(CLD.id == cld_id, CLD.user_id == user_id).first()
    if cld:
        if name is not None:
            cld.name = name
        if description is not None:
            cld.description = description
        if date is not None:
            cld.date = date
        db.commit()
        db.refresh(cld)
    return cld


def delete_cld(db: Session, cld_id: str, user_id: str):
    cld = db.query(CLD).filter(CLD.id == cld_id, CLD.user_id == user_id).first()
    if cld:
        db.delete(cld)
        db.commit()
        return True
    return False
