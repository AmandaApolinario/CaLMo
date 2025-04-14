from sqlalchemy import Column, Integer, String, ForeignKey, Enum, Date, Text
from sqlalchemy.orm import relationship
import enum
from . import db

class User(db.Model):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)

    objects = relationship("Object", back_populates="user")
    clds = relationship("CLD", back_populates="user")

class Object(db.Model):
    __tablename__ = 'objects'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String)

    user = relationship("User", back_populates="objects")

class RelationshipType(enum.Enum):
    Positive = "Positive"
    Negative = "Negative"

class CLD(db.Model):
    __tablename__ = 'clds'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    description = Column(Text)

    user = relationship("User", back_populates="clds")
    variable_clds = relationship("VariableCLD", back_populates="cld", cascade="all, delete-orphan")

class VariableCLD(db.Model):
    __tablename__ = 'variable_clds'

    id = Column(Integer, primary_key=True)
    cld_id = Column(Integer, ForeignKey('clds.id', ondelete='CASCADE'), nullable=False)
    from_variable_id = Column(Integer, ForeignKey('objects.id', ondelete='CASCADE'), nullable=False)
    to_variable_id = Column(Integer, ForeignKey('objects.id', ondelete='CASCADE'), nullable=False)
    type = Column(Enum(RelationshipType), nullable=False)

    cld = relationship("CLD", back_populates="variable_clds")
    from_variable = relationship("Object", foreign_keys=[from_variable_id])
    to_variable = relationship("Object", foreign_keys=[to_variable_id])