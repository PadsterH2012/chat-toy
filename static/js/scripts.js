document.addEventListener('DOMContentLoaded', () => {
    const sendMessageButton = document.getElementById('send-message');
    const userMessageInput = document.getElementById('user-message');
    const agentSelector = document.getElementById('agent-selector');
    const messagesDiv = document.getElementById('messages');
    const projectList = document.getElementById('project-list');
    const addProjectButton = document.getElementById('add-project');
    const projectModal = document.getElementById('project-modal');
    const closeModalButton = document.querySelector('.close');
    const saveProjectButton = document.getElementById('save-project');
    const projectTitle = document.getElementById('project-title');
    let currentProjectId = null;

    addProjectButton.addEventListener('click', () => {
        projectModal.style.display = 'block';
    });

    closeModalButton.addEventListener('click', () => {
        projectModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === projectModal) {
            projectModal.style.display = 'none';
        }
    });

    saveProjectButton.addEventListener('click', async () => {
        const projectName = document.getElementById('project-name').value;
        const projectDescription = document.getElementById('project-description').value;

        const response = await fetch('/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: projectName, description: projectDescription })
        });

        if (response.ok) {
            loadProjects();
            projectModal.style.display = 'none';
        }
    });

    async function loadProjects() {
        const response = await fetch('/projects');
        const projects = await response.json();
        projectList.innerHTML = '';

        projects.forEach(project => {
            const projectItem = document.createElement('div');
            projectItem.className = 'menu-item';
            projectItem.innerHTML = `${project.name} <button class="delete-button" data-project-id="${project.id}">X</button>`;
            projectItem.dataset.projectId = project.id;
            projectItem.addEventListener('click', (e) => {
                if (e.target.tagName !== 'BUTTON') {
                    currentProjectId = project.id;
                    projectTitle.textContent = project.name;
                    loadProjectConversations(project.id);
                }
            });
            projectList.appendChild(projectItem);
        });

        document.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const projectId = e.target.dataset.projectId;
                const response = await fetch(`/projects/${projectId}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    loadProjects();
                }
            });
        });
    }

    async function loadProjectConversations(projectId) {
        messagesDiv.innerHTML = '';
        const response = await fetch(`/conversations?project_id=${projectId}`);
        const conversations = await response.json();

        conversations.forEach(convo => {
            const userMessageDiv = document.createElement('div');
            userMessageDiv.classList.add('message', 'user');
            userMessageDiv.innerHTML = `<div>${convo.user_message}</div><div class="timestamp">${convo.timestamp}</div>`;
            messagesDiv.appendChild(userMessageDiv);

            const aiMessageDiv = document.createElement('div');
            aiMessageDiv.classList.add('message', 'ai');

            let aiResponse = convo.ai_response;
            if (aiResponse.includes('```')) {
                const parts = aiResponse.split('```');
                const textBeforeCode = parts[0];
                const code = parts[1];
                const textAfterCode = parts[2] || '';

                aiResponse = `${textBeforeCode}<pre><code>${code}</code></pre>${textAfterCode}`;
            }

            const avatar = convo.agent === 'gpt' ? 'gpt-avatar.png' : 'llama-avatar.png';
            aiMessageDiv.innerHTML = `<img src="/static/img/${avatar}" class="avatar"><div>${aiResponse}</div><div class="timestamp">${convo.timestamp}</div>`;
            messagesDiv.appendChild(aiMessageDiv);
        });
    }

    sendMessageButton.addEventListener('click', async () => {
        if (!currentProjectId) {
            alert('Please select a project first.');
            return;
        }

        const userMessage = userMessageInput.value;
        const agent = agentSelector.value;
        if (!userMessage) return;

        // Clear the input
        userMessageInput.value = '';

        // Add user message to the chat window
        const userMessageDiv = document.createElement('div');
        userMessageDiv.classList.add('message', 'user');
        const timestamp = new Date().toLocaleString();
        userMessageDiv.innerHTML = `<div>${userMessage}</div><div class="timestamp">${timestamp}</div>`;
        messagesDiv.appendChild(userMessageDiv);

        // Send message to the server
        const response = await fetch(`/chat/${currentProjectId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: userMessage, agent: agent })
        });

        const responseData = await response.json();

        // Add AI response to the chat window
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.classList.add('message', 'ai');

        let aiResponse = responseData.ai_response;
        if (aiResponse.includes('```')) {
            const parts = aiResponse.split('```');
            const textBeforeCode = parts[0];
            const code = parts[1];
            const textAfterCode = parts[2] || '';

            aiResponse = `${textBeforeCode}<pre><code>${code}</code></pre>${textAfterCode}`;
        }

        const avatar = agent === 'gpt' ? 'gpt-avatar.png' : 'llama-avatar.png';
        aiMessageDiv.innerHTML = `<img src="/static/img/${avatar}" class="avatar"><div>${aiResponse}</div><div class="timestamp">${timestamp}</div>`;
        messagesDiv.appendChild(aiMessageDiv);

        // Scroll to the bottom of the chat window
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });

    // Load projects on page load
    loadProjects();
});
