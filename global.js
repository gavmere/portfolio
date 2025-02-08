console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}


let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/index.html', title: 'Projects' },
    { url: 'contact/index.html', title: 'Contact' },
    { url: 'resume/index.html', title: 'Resume' },
    { url: 'https://github.com/gavmere', title: 'Github' },
  ];



let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    let title = p.title;
    const ARE_WE_HOME = document.documentElement.classList.contains('home');
    if (!ARE_WE_HOME && !url.startsWith('http')) {
        url = '../' + url;
    }
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;  
    a.classList.toggle(
        'current',
        a.host === location.host && a.pathname === location.pathname
    ); 
    nav.append(a);   
  }
document.body.insertAdjacentHTML(
    'afterbegin',
    `
      <label class="color-scheme">
          Theme:<select>
                <option value="light dark">Automatic</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
            </select>
      </label>`
);  

let select = document.querySelector('.color-scheme select');

if ("colorScheme" in localStorage) {
    document.documentElement.style.setProperty('color-scheme', localStorage.colorScheme);
    select.value = localStorage.colorScheme;
}

select.addEventListener('input', function (event) {
    document.documentElement.style.setProperty('color-scheme', event.target.value);
    localStorage.colorScheme = event.target.value;
});
  
  
export async function fetchJSON(url) {
  try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }
      console.log('response', response);
      const data = await response.json();
      return data

  } catch (error) {
      console.error('Error fetching or parsing JSON data:', error);
  }
}


export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  const validHeadings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  const safeHeadingLevel = validHeadings.includes(headingLevel.toLowerCase()) 
    ? headingLevel.toLowerCase() 
    : 'h2';

  containerElement.innerHTML = '';

  if (Array.isArray(projects)) {
    projects.forEach(project => {
      const article = document.createElement('article');
      article.innerHTML = `
        <${safeHeadingLevel}>${project.title}</${safeHeadingLevel}>
        <img src="${project.image}" alt="${project.title}">
        <div class="project-content">
          <p>${project.description}</p>
          <p class="project-year" style="font-family: 'Playfair Display', serif; font-style: italic;">c.${project.year || 'Year not specified'}</p>
        </div>
      `;
      containerElement.appendChild(article);
    });
  }
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}
const githubData = await fetchGitHubData('gavmere');
const profileStats = document.querySelector('#profile-stats');
if (profileStats) {
  profileStats.innerHTML = `
        <dl>
          <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
          <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
          <dt>Followers:</dt><dd>${githubData.followers}</dd>
          <dt>Following:</dt><dd>${githubData.following}</dd>
        </dl>
    `;
}
