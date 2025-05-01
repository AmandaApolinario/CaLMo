from sqlalchemy import Column, Integer, String, ForeignKey, Enum as SqlEnum, Date, Text, Table
from sqlalchemy.orm import relationship
import enum
from datetime import date
import uuid
import networkx as nx
from . import db

# Enums
class RelationshipType(enum.Enum):
    POSITIVE = "Positive"
    NEGATIVE = "Negative"

class LoopType(enum.Enum):
    BALANCING = "Balancing"
    REINFORCING = "Reinforcing"

class ArchetypeType(enum.Enum):
    SHIFTING_THE_BURDEN = "Shifting the Burden"

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

    def identify_feedback_loops(self, session):
        """Identifies feedback loops within the CLD using networkx."""
        G = nx.DiGraph()
        
        # Add edges to the graph
        for rel in self.relationships:
            G.add_edge(rel.source_id, rel.target_id, type=rel.type)

        # Find all simple cycles in the graph
        cycles = list(nx.simple_cycles(G))
        unique_cycles = set()

        for cycle in cycles:
            # Convert cycle to a canonical form (sorted tuple)
            canonical_cycle = tuple(sorted(cycle))
            if canonical_cycle not in unique_cycles:
                unique_cycles.add(canonical_cycle)
                self.classify_cycle(cycle, session)

    def classify_cycle(self, cycle, session):
        """Classifies a cycle as reinforcing or balancing."""
        negative_count = 0

        for i in range(len(cycle)):
            source = cycle[i]
            target = cycle[(i + 1) % len(cycle)]
            for rel in self.relationships:
                if rel.source_id == source and rel.target_id == target:
                    if rel.type == RelationshipType.NEGATIVE:
                        negative_count += 1

        loop_type = LoopType.REINFORCING if negative_count % 2 == 0 else LoopType.BALANCING

        feedback_loop = FeedbackLoop(type=loop_type, cld=self)
        session.add(feedback_loop)
        
        # Verify all cycle variables are present
        cycle_variables = []
        for node in cycle:
            variable = next((var for var in self.variables if var.id == node), None)
            if variable is None:
                raise ValueError(f"Variable with id {node} not found in CLD variables.")
            cycle_variables.append(variable)
        
        feedback_loop.variables = cycle_variables
        self.feedback_loops.append(feedback_loop)

    def identify_archetypes(self, session):
        """Identifies system archetypes within the CLD."""
        self.identify_shifting_the_burden(session)

    def identify_shifting_the_burden(self, session):
        """Identifies the 'Shifting the Burden' archetype within the CLD."""
        rel_map = {(rel.source_id, rel.target_id): rel.type for rel in self.relationships}

        for var_ps in self.variables:
            var_ss_candidates = [
                var for var in self.variables 
                if rel_map.get((var.id, var_ps.id)) == RelationshipType.NEGATIVE 
                and rel_map.get((var_ps.id, var.id)) == RelationshipType.POSITIVE
            ]
            var_fs_candidates = [
                var for var in self.variables 
                if rel_map.get((var.id, var_ps.id)) == RelationshipType.NEGATIVE 
                and rel_map.get((var_ps.id, var.id)) == RelationshipType.POSITIVE
            ]

            for var_ss in var_ss_candidates:
                for var_fs in var_fs_candidates:
                    var_se_candidates = [
                        var for var in self.variables 
                        if rel_map.get((var_ss.id, var.id)) == RelationshipType.POSITIVE 
                        and rel_map.get((var.id, var_fs.id)) == RelationshipType.NEGATIVE
                    ]

                    for var_se in var_se_candidates:
                        archetype = Archetype(type=ArchetypeType.SHIFTING_THE_BURDEN, cld=self)
                        archetype.variables.extend([var_ps, var_ss, var_fs, var_se])
                        session.add(archetype)
                        self.archetypes.append(archetype)

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