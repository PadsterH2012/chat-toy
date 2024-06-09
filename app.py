from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import openai
import requests
import os
import logging
from config import Config

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///conversations.db'
db = SQLAlchemy(app)

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# OpenAI API Key
openai.api_key = Config.OPENAI_API_KEY
print("OpenAI API Key:", openai.api_key)  # Debug print to verify the API key

# Check if API key is loaded
if openai.api_key is None:
    logging.error("OpenAI API key not found. Make sure it is set in the config.py file.")

# Database models
class Conversation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_message = db.Column(db.String(512))
    ai_response = db.Column(db.String(512))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), unique=True, nullable=False)
    description = db.Column(db.String(512))
    conversations = db.relationship('Conversation', backref='project', lazy=True)

# Initialize the database
@app.before_first_request
def create_tables():
    db.create_all()

# Route to render the HTML template
@app.route('/')
def index():
    return render_template('index.html')

# Route to get all projects
@app.route('/projects', methods=['GET'])
def get_projects():
    projects = Project.query.all()
    return jsonify([{
        'id': project.id,
        'name': project.name,
        'description': project.description
    } for project in projects])

# Route to add a new project
@app.route('/projects', methods=['POST'])
def add_project():
    data = request.get_json()
    name = data.get('name')
    description = data.get('description')
    new_project = Project(name=name, description=description)
    db.session.add(new_project)
    db.session.commit()
    return jsonify({'id': new_project.id}), 201

# Route to delete a project
@app.route('/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    project = Project.query.get_or_404(project_id)
    db.session.delete(project)
    db.session.commit()
    return '', 204

# Route to get all conversations for a project
@app.route('/conversations', methods=['GET'])
def get_conversations():
    project_id = request.args.get('project_id')
    conversations = Conversation.query.filter_by(project_id=project_id).all()
    return jsonify([{
        'user_message': convo.user_message,
        'ai_response': convo.ai_response,
        'timestamp': convo.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
        'agent': 'gpt' if 'gpt' in convo.ai_response.lower() else 'llama'
    } for convo in conversations])

# Route to handle chat messages
@app.route('/chat/<int:project_id>', methods=['POST'])
def chat(project_id):
    data = request.get_json()
    message = data['message']
    agent = data['agent']

    if agent == 'gpt':
        response = openai.Completion.create(
            model="text-davinci-003",
            prompt=message,
            max_tokens=150
        )
        ai_response = response['choices'][0]['text'].strip()
    elif agent == 'llama':
        payload = {
            "model": "llama3:8b-instruct-q8_0",
            "input": message
        }
        response = requests.post("http://10.203.20.99:11434/api/generate", json=payload)
        logging.debug(f"LLaMA API response status code: {response.status_code}")
        logging.debug(f"LLaMA API response content: {response.content}")
        if response.status_code == 200:
            result = response.json()
            ai_response = result.get('response', '').strip()
            if not ai_response:
                ai_response = "LLaMA API returned an empty response."
        else:
            ai_response = "Failed to fetch response from Ollama."

    new_conversation = Conversation(
        user_message=message,
        ai_response=ai_response,
        timestamp=datetime.now(),
        project_id=project_id
    )
    db.session.add(new_conversation)
    db.session.commit()

    return jsonify({'ai_response': ai_response})

if __name__ == '__main__':
    app.run(debug=True)
