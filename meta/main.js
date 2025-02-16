let data = [];


let brushSelection = null;

// At the top of the file, add these global variables
let xScale, yScale;
function brushed(event) {
  brushSelection = event.selection;
  updateSelection();
}

function isCommitSelected(commit) {
    if (!brushSelection) return false;
    
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);
    
    return x >= brushSelection[0][0] 
        && x <= brushSelection[1][0] 
        && y >= brushSelection[0][1] 
        && y <= brushSelection[1][1];
}

function updateLanguageBreakdown() {
    const selectedCommits = brushSelection
        ? commits.filter(isCommitSelected)
        : [];
    const container = document.getElementById('language-breakdown');

    if (selectedCommits.length === 0) {
        container.innerHTML = '<div class="placeholder-message">Select commits to see language breakdown</div>';
        return;
    }

    const lines = selectedCommits.flatMap((d) => d.lines);
    const breakdown = d3.rollup(
        lines,
        (v) => v.length,
        (d) => d.type
    );

    // Clear existing content
    container.innerHTML = '';

    // Add each language stat
    for (const [language, count] of breakdown) {
        const proportion = count / lines.length;
        const formatted = d3.format('.1~%')(proportion);

        const stat = d3.select(container)
            .append('div');
        stat.append('dt')
            .text(language);
        stat.append('dd')
            .html(`${count} lines (${formatted})`);
    }

    return breakdown;
}

  
function updateSelection() {
  d3.selectAll('circle').classed('selected', (d) => isCommitSelected(d));
}


function brushSelector() {
    const svg = document.querySelector('svg');
    const brush = d3.brush()
        .on('start brush end', brushed);
    
    d3.select(svg)
        .call(brush);
    
    // Raise dots above brush overlay
    d3.select(svg)
        .selectAll('.dots, .overlay ~ *')
        .raise();
}

function updateSelectionCount() {
  const selectedCommits = brushSelection
    ? commits.filter(isCommitSelected)
    : [];

  const countElement = document.getElementById('selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

  

function brushed(event) {
    brushSelection = event.selection;
    updateSelection();
    updateLanguageBreakdown();
    updateSelectionCount();
}
  
  
function processCommits() {
    commits = d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            let first = lines[0];
            let { author, date, time, timezone, datetime } = first;
            let ret = {
                id: commit,
                url: 'https://github.com/gavmere/portfolio/commit/' + commit,
                author,
                date,
                time,
                timezone,
                datetime,
                hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
                totalLines: lines.length,
            };

            Object.defineProperty(ret, 'lines', {
                value: lines,
                // What other options do we need to set?
                // Hint: look up configurable, writable, and enumerable
            });

            return ret;
        });
}

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line), // or just +row.line
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));
    displayStats();
    createScatterplot();
}

function displayStats() {
    // Process commits first
    processCommits();

    // Create the dl element with the stats-grid class
    const dl = d3.select('#stats')
        .attr('class', 'stats-grid');

    // Clear existing content
    dl.html('');

    // Add stats with consistent styling
    const addStat = (label, value) => {
        const stat = dl.append('div');
        stat.append('dt').text(label);
        stat.append('dd').html(value);
    };

    // Add all stats
    addStat('Total LOC', `<abbr title="Lines of code">${data.length}</abbr>`);
    addStat('Total Commits', commits.length);
    addStat('Files', new Set(data.map(d => d.file)).size);
    
    const timeOfDay = hour => {
        if (hour >= 5 && hour < 12) return 'Morning';
        if (hour >= 12 && hour < 17) return 'Afternoon';
        if (hour >= 17 && hour < 21) return 'Evening';
        return 'Night';
    };

    const commitsByTime = d3.rollup(
        commits,
        v => v.length,
        d => timeOfDay(d.datetime.getHours())
    );
    
    const mostActiveTime = Array.from(commitsByTime.entries())
        .sort((a, b) => b[1] - a[1])[0][0];
    
    addStat('Most Active Time', mostActiveTime);
    
    const avgLength = d3.mean(data, d => d.length);
    addStat('Avg Line Length', `${Math.round(avgLength)} chars`);

    const avgLinesPerCommit = d3.mean(commits, d => d.totalLines);
    addStat('Avg Lines/Commit', `${Math.round(avgLinesPerCommit)}`);

    // Add most active author stat
    const authorCommits = d3.rollup(
        commits,
        v => v.length,
        d => d.author
    );
    const mostActiveAuthor = Array.from(authorCommits.entries())
        .sort((a, b) => b[1] - a[1])[0];
    addStat('Most Active Author', `${mostActiveAuthor[0]} (${mostActiveAuthor[1]} commits)`);

    // Add total time span stat
    const timeSpan = d3.extent(commits, d => d.datetime);
    const daysDiff = Math.round((timeSpan[1] - timeSpan[0]) / (1000 * 60 * 60 * 24));
    addStat('Project Duration', `${daysDiff} days`);
}
  

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
});

function createScatterplot(){
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const width = 1000;
    const height = 600;
    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3
  .scaleSqrt() // Change only this line
  .domain([minLines, maxLines])
  .range([10, 25]);

    
    const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    xScale = d3.scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([0, width])
        .nice();

    yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([height, 0]);

    const dots = svg.append('g').attr('class', 'dots');

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
      };
      
      // Update scales with new ranges
      xScale.range([usableArea.left, usableArea.right]);
      yScale.range([usableArea.bottom, usableArea.top]);
      const xAxis = d3.axisBottom(xScale);
      const yAxis = d3
      .axisLeft(yScale)
      .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');
      const gridlines = svg
      .append('g')
      .attr('class', 'gridlines')
      .attr('transform', `translate(${usableArea.left}, 0)`);
  
  // Create gridlines with reduced opacity
  gridlines
      .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width))
      .style('opacity', 0.2);  // Add this line to make gridlines more transparent

    
    // Create gridlines as an axis with no labels and full-width ticks
        gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));
            // Add X axis
            svg
            .append('g')
            .attr('transform', `translate(0, ${usableArea.bottom})`)
            .call(xAxis);
          
          // Add Y axis
          svg
            .append('g')
            .attr('transform', `translate(${usableArea.left}, 0)`)
            .call(yAxis);
            dots
            .selectAll('circle')
            .data(sortedCommits)
            .join('circle')
            .attr('cx', (d) => xScale(d.datetime))
            .attr('cy', (d) => yScale(d.hourFrac))
            .attr('r', (d) => rScale(d.totalLines))
            .attr('fill', 'steelblue')
            .style('fill-opacity', 0.7)
            .on('mouseenter', (event, commit) => {
                updateTooltipContent(commit);
                updateTooltipPosition(event);
                d3.select(event.target)
                    .transition()
                    .duration(200)
                    .attr('r', (d) => rScale(d.totalLines) * 1.2)
                    .style('fill-opacity', 1);
            })
            .on('mousemove', (event) => {
                updateTooltipPosition(event);
            })
            .on('mouseleave', (event) => {
                updateTooltipContent({});
                d3.select(event.target)
                    .transition()
                    .duration(200)
                    .attr('r', (d) => rScale(d.totalLines))
                    .style('fill-opacity', 0.7);
            });
            brushSelector()
    }



    function updateTooltipContent(commit) {
        const tooltip = document.getElementById('commit-tooltip');
        const link = document.getElementById('commit-link');
        const date = document.getElementById('commit-date');
        const time = document.getElementById('commit-time');
        const author = document.getElementById('commit-author');
        const lines = document.getElementById('commit-lines');
    
        if (Object.keys(commit).length === 0) {
            tooltip.hidden = true;
            return;
        }
    
        tooltip.hidden = false;
        link.href = commit.url;
        link.textContent = commit.id;
        date.textContent = commit.datetime?.toLocaleString('en', {
            dateStyle: 'full'
        });
        time.textContent = commit.time;
        author.textContent = commit.author;
        lines.textContent = commit.totalLines;
    }
    
    function updateTooltipPosition(event) {
        const tooltip = document.getElementById('commit-tooltip');
        const padding = 10;
        
        // Position tooltip near cursor but avoid viewport edges
        const tooltipRect = tooltip.getBoundingClientRect();
        let x = event.clientX + padding;
        let y = event.clientY + padding;
        
        if (x + tooltipRect.width > window.innerWidth) {
            x = event.clientX - tooltipRect.width - padding;
        }
        if (y + tooltipRect.height > window.innerHeight) {
            y = event.clientY - tooltipRect.height - padding;
        }
        
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }


