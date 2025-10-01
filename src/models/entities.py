from sqlalchemy import Column, Integer, String, ForeignKey, Enum as SqlEnum, Date, Text, Table
from sqlalchemy.orm import relationship
import enum
from datetime import date
import uuid
import networkx as nx
from .. import db

# Enums
class RelationshipType(enum.Enum):
    POSITIVE = "Positive"
    NEGATIVE = "Negative"

class LoopType(enum.Enum):
    BALANCING = "Balancing"
    REINFORCING = "Reinforcing"

class ArchetypeType(enum.Enum):
    SHIFTING_THE_BURDEN = "Shifting the Burden"
    FIXES_THAT_FAIL = "Fixes that Fail"
    LIMITS_TO_SUCCESS = "Limits to Success"
    DRIFTING_GOALS = "Drifting Goals"
    GROWTH_AND_UNDERINVESTMENT = "Growth and Underinvestment"
    SUCCESS_TO_THE_SUCCESSFUL = "Success to the Successful"
    ESCALATION = "Escalation"
    TRAGEDY_OF_THE_COMMONS = "Tragedy of the Commons"

# Association Tables
cld_variables = Table(
    'cld_variables', db.metadata,
    Column('cld_id', String, ForeignKey('clds.id')),
    Column('variable_id', String, ForeignKey('variables.id'))
)

feedback_loop_variables = Table(
    'feedback_loop_variables', db.metadata,
    Column('feedback_loop_id', String, ForeignKey('feedback_loops.id')),
    Column('variable_id', String, ForeignKey('variables.id'))
)

archetype_variables = Table(
    'archetype_variables', db.metadata,
    Column('archetype_id', String, ForeignKey('archetypes.id')),
    Column('variable_id', String, ForeignKey('variables.id'))
)

# Models
class User(db.Model):
    __tablename__ = 'users'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)

    variables = relationship("Variable", back_populates="user")
    clds = relationship("CLD", back_populates="user")

class Variable(db.Model):
    __tablename__ = 'variables'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(String)
    user_id = Column(String, ForeignKey('users.id'))
    
    user = relationship("User", back_populates="variables")

class CLD(db.Model):
    __tablename__ = 'clds'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text)
    date = Column(Date, default=date.today)
    user_id = Column(String, ForeignKey('users.id'))
    
    user = relationship("User", back_populates="clds")
    variables = relationship('Variable', secondary=cld_variables)
    relationships = relationship('Relationship', back_populates='cld')
    feedback_loops = relationship(
        'FeedbackLoop',
        back_populates='cld',
        cascade='all, delete-orphan'
    )

    archetypes = relationship(
        'Archetype',
        back_populates='cld',
        cascade='all, delete-orphan'
    )

class Relationship(db.Model):
    __tablename__ = 'relationships'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id = Column(String, ForeignKey('variables.id'))
    target_id = Column(String, ForeignKey('variables.id'))
    type = Column(SqlEnum(RelationshipType))
    cld_id = Column(String, ForeignKey('clds.id'))
    
    cld = relationship('CLD', back_populates='relationships')

class FeedbackLoop(db.Model):
    __tablename__ = 'feedback_loops'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    type = Column(SqlEnum(LoopType))
    cld_id = Column(String, ForeignKey('clds.id'))
    
    cld = relationship('CLD', back_populates='feedback_loops')
    variables = relationship('Variable', secondary=feedback_loop_variables)

class Archetype(db.Model):
    __tablename__ = 'archetypes'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    type = Column(SqlEnum(ArchetypeType))
    cld_id = Column(String, ForeignKey('clds.id'))
    
    cld = relationship('CLD', back_populates='archetypes')
    variables = relationship('Variable', secondary=archetype_variables) 