class TodoApp {
    constructor() {
        this.tasks = [];
        this.listElement = document.getElementById('taskList');
        this.taskInput = document.getElementById('taskInput');
        this.dateInput = document.getElementById('dateInput');
        this.addTaskButton = document.getElementById('addTaskButton');
        this.searchInput = document.getElementById('searchInput');

        this.loadTasks();
        this.attachEventListeners();
        this.render();
    }

    loadTasks() {
        const storedTasks = localStorage.getItem('tasks');
        if (storedTasks) {
            this.tasks = JSON.parse(storedTasks);
        }
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    getFilteredTasks(query) {
        if (!query || query.length < 2) {
            return this.tasks;
        }
        return this.tasks.filter(task =>
            task.text.toLowerCase().includes(query)
        );
    }

    render(query = '') {
        const tasksToRender = this.getFilteredTasks(query);
        this.listElement.innerHTML = '';

        tasksToRender.forEach((task) => {
            const listItem = document.createElement('li');
            const originalIndex = this.tasks.indexOf(task);
            listItem.setAttribute('data-index', originalIndex);
            listItem.classList.toggle('completed', task.completed); 

            let taskText = task.text;
            let dateText = task.deadline ? task.deadline : '';
            
            let displayContent = taskText;
            if (query && query.length >= 2) {
                const regex = new RegExp(query, 'gi');
                displayContent = taskText.replace(regex, match => `<span class="highlight">${match}</span>`);
            }

            listItem.innerHTML = `
                <input type="checkbox" class="task-completed-checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text-content">${displayContent}</span>
                <span class="task-deadline">${dateText}</span>
                <button class="delete-button">Delete</button>
            `;
            this.listElement.appendChild(listItem);
        });
    }

    addTask() {
        const text = this.taskInput.value.trim();
        const deadline = this.dateInput.value;

        if (text.length < 3 || text.length > 255) {
            alert("Must be 3-255 characters long.");
            return;
        }
        if (deadline) {
            const selectedDate = new Date(deadline);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            if (selectedDate < now) {
                alert("Date must be today or in the future.");
                return;
            }
        }
        
        const newTask = { text, deadline, completed: false };
        this.tasks.push(newTask);
        this.saveTasks();
        this.taskInput.value = '';
        this.dateInput.value = '';
        this.render();
    }

    deleteTask(index) {
        this.tasks.splice(index, 1);
        this.saveTasks();
        this.render();
    }

    updateText(index, newText) {
        if (newText.length < 3 || newText.length > 255) {
            alert("Tekst musi mieć 3-255 znaków.");
            return false;
        }
        this.tasks[index].text = newText;
        this.saveTasks();
        this.render();
        return true;
    }
    
    updateDeadline(index, newDeadline) {
        if (newDeadline) {
            const selectedDate = new Date(newDeadline);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            if (selectedDate < now) {
                alert("Date must be today or in the future.");
                return false;
            }
        }
        this.tasks[index].deadline = newDeadline;
        this.saveTasks();
        this.render();
        return true;
    }
    
    toggleCompleted(index) {
        this.tasks[index].completed = !this.tasks[index].completed;
        this.saveTasks();
        this.render();
    }

    attachEventListeners() {
        this.addTaskButton.addEventListener('click', () => this.addTask());
        this.listElement.addEventListener('click', (e) => this.handleListClick(e));
        this.listElement.addEventListener('change', (e) => this.handleCheckboxChange(e));
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e));
    }
    
    handleListClick(event) {
        const element = event.target;
        
        if (element.classList.contains('delete-button')) {
            const index = parseInt(element.closest('li').getAttribute('data-index'));
            this.deleteTask(index);
            return;
        }
        
        if (element.classList.contains('task-text-content')) {
            this.enterEditMode(element, 'text');
        }

        if (element.classList.contains('task-deadline')) {
            this.enterEditMode(element, 'deadline');
        }
    }

    handleCheckboxChange(event) {
        const element = event.target;
        if (element.classList.contains('task-completed-checkbox')) {
            const index = parseInt(element.closest('li').getAttribute('data-index'));
            this.toggleCompleted(index);
        }
    }
    
    handleSearch(event) {
        const query = event.target.value.trim().toLowerCase();
        this.render(query); 
    }
    
    enterEditMode(element, fieldType) {
        const listItem = element.closest('li');
        const indexToEdit = parseInt(listItem.getAttribute('data-index'));
        const isText = fieldType === 'text';
        
        if (!this.tasks[indexToEdit]) return;

        const currentValue = isText ? this.tasks[indexToEdit].text : this.tasks[indexToEdit].deadline;

        const editInput = document.createElement('input');
        editInput.type = isText ? 'text' : 'date';
        editInput.className = isText ? 'edit-input' : 'edit-input-date';
        editInput.value = currentValue || '';

        listItem.replaceChild(editInput, element);
        editInput.focus();

        const saveHandler = () => this.exitEditMode(editInput, indexToEdit, isText);
        
        editInput.addEventListener('blur', saveHandler);
        editInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveHandler();
            }
        });
    }

    exitEditMode(editInput, indexToEdit, isText) {
        editInput.removeEventListener('blur', arguments.callee);
        
        if (!editInput.parentNode) return;

        const newValue = editInput.value.trim();
        let success = false;
        
        if (isText) {
            success = this.updateText(indexToEdit, newValue);
        } else {
            success = this.updateDeadline(indexToEdit, newValue);
        }
        
        if (!success) {
            editInput.focus();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.todoAppInstance) return; 
    window.todoAppInstance = new TodoApp();
});