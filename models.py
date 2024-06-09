from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(500), nullable=True)

class Conversation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_message = db.Column(db.String(500))
    ai_response = db.Column(db.String(500))
    agent = db.Column(db.String(50))
    timestamp = db.Column(db.DateTime, default=db.func.current_timestamp())
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    project = db.relationship('Project', backref=db.backref('conversations', lazy=True))

class FileStructure(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    is_folder = db.Column(db.Boolean, default=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('file_structure.id'), nullable=True)
    parent = db.relationship('FileStructure', remote_side=[id], backref='children')
    content = db.Column(db.Text, nullable=True)
