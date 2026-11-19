import re

with open('perf/phase3/boot-style.html', 'r', encoding='utf-8') as f:
    boot_style = f.read().strip()

with open('src/components/ui/RingAssembleLoader.jsx', 'r', encoding='utf-8') as f:
    loader_jsx = f.read()

# Extract the rl-wrap markup from RingAssembleLoader.jsx
# In RingAssembleLoader.jsx:
# <div className="rl-wrap" aria-hidden="true">
# ...
# </div>

# Let's craft the exact HTML markup for #cg-boot
boot_html = """    <!-- Static Boot Loader: paints logo + blueprint ring assembly before JS evaluates -->
    <div id="cg-boot" role="progressbar" aria-label="Cinegem Studio Loading" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
      <div class="cg-col">
        <div class="cg-logo">
          <img src="/Logo.png" alt="Cinegem Studio" width="1000" height="1000" fetchpriority="high" decoding="async">
        </div>
        <!-- keep in sync with RingAssembleLoader.jsx -->
        <div class="rl-wrap" aria-hidden="true">
          <svg class="rl-svg" viewBox="30 44 140 150" fill="none" aria-hidden="true" focusable="false">
            <g class="rl-guides">
              <line class="rl-g rl-gx" x1="36" y1="138" x2="164" y2="138"></line>
              <line class="rl-g rl-gy" x1="100" y1="48" x2="100" y2="190"></line>
              <circle class="rl-g rl-gc" cx="100" cy="138" r="49"></circle>
              <circle class="rl-g rl-gc" cx="100" cy="138" r="39"></circle>
              <line class="rl-g rl-gem-g1" x1="79" y1="72.5" x2="121" y2="72.5"></line>
              <line class="rl-g rl-gem-g2" x1="88" y1="62" x2="112" y2="62"></line>
              <line class="rl-g rl-gem-g3" x1="100" y1="58" x2="100" y2="96"></line>
              <g class="rl-arm">
                <line x1="100" y1="138" x2="100" y2="94"></line>
                <circle cx="100" cy="94" r="2.6"></circle>
              </g>
            </g>
            <!-- Ring Band: Native clockwise SVG arc starting at 12 o'clock (100, 94) -->
            <path class="rl-band" d="M 100 94 A 44 44 0 0 1 100 182 A 44 44 0 0 1 100 94" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" fill="none"></path>
            <path class="rl-gem-line" d="M79 72.5 L88 62 L112 62 L121 72.5 L100 92 Z" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round" fill="none"></path>
            <g class="rl-facet-lines">
              <polygon points="79,72.5 88,62 94,72.5"></polygon>
              <polygon points="88,62 112,62 106,72.5 94,72.5"></polygon>
              <polygon points="112,62 121,72.5 106,72.5"></polygon>
              <polygon points="79,72.5 94,72.5 100,92"></polygon>
              <polygon points="94,72.5 106,72.5 100,92"></polygon>
              <polygon points="106,72.5 121,72.5 100,92"></polygon>
            </g>
            <path class="rl-collar" d="M89 91 L111 91 L107 98 L93 98 Z" fill="#ffffff"></path>
            <g class="rl-fills">
              <polygon style="--i:0;" points="79,72.5 88,62 94,72.5" fill="#f6c3d6"></polygon>
              <polygon style="--i:1;" points="88,62 112,62 106,72.5 94,72.5" fill="#ffffff"></polygon>
              <polygon style="--i:2;" points="112,62 121,72.5 106,72.5" fill="#f6c3d6"></polygon>
              <polygon style="--i:3;" points="79,72.5 94,72.5 100,92" fill="#e58ab0"></polygon>
              <polygon style="--i:4;" points="94,72.5 106,72.5 100,92" fill="#c9446f"></polygon>
              <polygon style="--i:5;" points="106,72.5 121,72.5 100,92" fill="#e58ab0"></polygon>
            </g>
            <g transform="translate(119 59)">
              <path class="rl-spark" d="M0 -6 Q1.2 -1.2 6 0 Q1.2 1.2 0 6 Q-1.2 1.2 -6 0 Q-1.2 -1.2 0 -6Z"></path>
            </g>
          </svg>
          <div class="rl-bar">
            <i></i>
          </div>
        </div>
      </div>
    </div>
    <script>
      // Only the home route gets the boot loader (index.html serves every route).
      if (location.pathname !== '/') {
        var b = document.getElementById('cg-boot');
        if (b) b.remove();
      }
    </script>"""

with open('index.html', 'r', encoding='utf-8') as f:
    index_html = f.read()

# Insert boot_style before </head>
index_html = index_html.replace('</head>', f'{boot_style}\n  </head>')

# Insert boot_html before <div id="root"></div>
index_html = index_html.replace('<div id="root"></div>', f'{boot_html}\n    <div id="root"></div>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(index_html)

print('Updated index.html successfully!')
