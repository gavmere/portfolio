import { fetchJSON, renderProjects } from '../global.js';
const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');
const projects = await fetchJSON('../lib/projects.json');

if (projects && Array.isArray(projects)) {
    projectsTitle.textContent = `I'd like to show you ${projects.length} projects `;
}

// Render projects
renderProjects(projects, projectsContainer, 'h2');