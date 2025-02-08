import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
const projectsContainer = document.querySelector('.projects');
const projectsTitle = document.querySelector('.projects-title');
const projects = await fetchJSON('../lib/projects.json');
// Render projects
function renderProjectStats(projects) {
    let selectedIndex = -1;
    
    // Clear existing elements
    d3.select('svg').selectAll('path').remove();
    d3.select('.legend').selectAll('li').remove();
    
    let rolledData = d3.rollups(
        projects,
        (v) => v.length,
        (d) => d.year,
    );
    
    let data = rolledData.map(([year, count]) => {
        return { value: count, label: year };
    });
    
    let sliceGenerator = d3.pie().value((d) => d.value);
    let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
    let arcData = sliceGenerator(data);
    let colors = d3.scaleOrdinal(d3.schemeTableau10);

    // Add pie slices with interactivity
    arcData.forEach((d, idx) => {
        d3.select('svg')
          .append('path')
          .attr('d', arcGenerator(d))
          .attr('fill', colors(idx))
          .style('cursor', 'pointer')
          .on('click', function() {
              selectedIndex = selectedIndex === idx ? -1 : idx;
              
              // Update pie slice selection
              d3.selectAll('path')
                .attr('class', (_, i) => i === selectedIndex ? 'selected' : '');
              
              // Update legend selection  
              d3.selectAll('.legend-item')
                .attr('class', (_, i) => i === selectedIndex ? 'legend-item selected' : 'legend-item');
              
              // Filter projects
              if (selectedIndex === -1) {
                  renderProjects(projects, projectsContainer, 'h2');
              } else {
                  const selectedYear = data[selectedIndex].label;
                  const filteredProjects = projects.filter(p => p.year === selectedYear);
                  renderProjects(filteredProjects, projectsContainer, 'h2');
              }
          });
    });

    // Update legend with same functionality
    let legend = d3.select('.legend');
    legend.attr('style', 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; padding: 2rem; margin: 2rem; border: 1px solid #ccc; border-radius: 4px; list-style: none; width: 100%; box-sizing: border-box;')
          .style('max-width', '600px')
          .style('margin', '2rem auto');

    data.forEach((d, idx) => {
        legend.append('li')
              .attr('style', `--color:${colors(idx)}`)
              .attr('class', 'legend-item')
              .style('display', 'flex')
              .style('align-items', 'center')
              .style('gap', '0.5rem')
              .style('padding', '0.1rem')
              .style('cursor', 'pointer')
              .html(`<span class="swatch" style="display: inline-block; width: 1em; height: 1em; background-color: var(--color); border-radius: 3px;"></span> ${d.label} <em>(${d.value})</em>`)
              .on('click', function() {
                  // Trigger same behavior as pie slice click
                  d3.select('svg')
                    .selectAll('path')
                    .filter((_, i) => i === idx)
                    .dispatch('click');
              });
    });
}

renderProjects(projects, projectsContainer, 'h2');
renderProjectStats(projects)



let query = '';
let searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('change', (event) => {
  // update query value
  query = event.target.value;
  // filter projects
  let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });
  // render filtered projects
  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderProjectStats(filteredProjects)
});
