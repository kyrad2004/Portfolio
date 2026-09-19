/* Portfolio motion layer — no dependencies, no build step.
   Loaded with `defer` on every page. Everything degrades to a plain,
   fully-visible page if this file never runs. */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------------------------------------------------------------
       Reveal elements as they scroll into view.
       Targets are tagged here rather than in the HTML so the markup
       stays clean and no-JS visitors never see hidden content.
       --------------------------------------------------------------- */
    function setupReveal() {
        var groups = [
            '.project-grid .project-card',
            '.skills-section .cells .cell',
            '.skills-section .certification',
            '.experience-section .entry',
            '.intro-section .text h2',
            '.intro-section .text p',
            '.intro-section .text .links',
            '.intro-section .headshot',
            '.project-detail-hero',
            '.project-detail .description',
            '.project-detail .project-actions',
            '.project-detail .demo-section',
            '.skills-section > h2',
            '.skills-section > .text',
            '.project-section > h2',
            '.experience-section > h2'
        ];

        var targets = [];
        groups.forEach(function (selector) {
            var found = document.querySelectorAll(selector);
            // Stagger each group independently so rows cascade rather than
            // every card on the page sharing one delay ramp.
            Array.prototype.forEach.call(found, function (el, i) {
                el.style.setProperty('--reveal-delay', Math.min(i, 6) * 0.07 + 's');
                el.setAttribute('data-reveal', '');
                targets.push(el);
            });
        });

        if (!targets.length) return;

        if (reduceMotion || !('IntersectionObserver' in window)) {
            targets.forEach(function (el) { el.classList.add('is-visible'); });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

        targets.forEach(function (el) { observer.observe(el); });

        // The negative bottom rootMargin above means an element sitting in the
        // last 10% of a page that can't scroll any further never intersects,
        // and would stay invisible for good. Once we're at the bottom of the
        // page, reveal whatever is left.
        function revealRemainder() {
            var atBottom = window.innerHeight + window.scrollY >=
                           document.documentElement.scrollHeight - 2;
            if (!atBottom) return;
            targets.forEach(function (el) {
                if (el.classList.contains('is-visible')) return;
                el.classList.add('is-visible');
                observer.unobserve(el);
            });
        }

        window.addEventListener('scroll', revealRemainder, { passive: true });
        window.addEventListener('resize', revealRemainder);
        revealRemainder();
    }

    /* ---------------------------------------------------------------
       Hero: cycle the role words in the sub-headline.
       --------------------------------------------------------------- */
    function setupRotator() {
        var rotator = document.querySelector('.rotator');
        if (!rotator) return;

        var items = rotator.querySelectorAll('.rotator-item');
        if (items.length < 2) return;

        // Size the container to the visible word, otherwise the grid cell is
        // as wide as the longest option and the rest of the sentence sits
        // behind a gap.
        function fitTo(el) {
            rotator.style.width = el.getBoundingClientRect().width + 'px';
        }

        var index = 0;

        function begin() {
            fitTo(items[0]);
            if (reduceMotion) return;
            cycle();
        }

        // Widths depend on the webfont, so wait for it where we can.
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(begin).catch(begin);
        } else {
            begin();
        }

        window.addEventListener('resize', function () { fitTo(items[index]); });

        function cycle() {
        setInterval(function () {
            var current = items[index];
            index = (index + 1) % items.length;
            var next = items[index];

            current.classList.remove('is-active');
            current.classList.add('is-leaving');
            next.classList.add('is-active');
            fitTo(next);

            // Park the outgoing word below again once it has faded out,
            // so it slides up from the bottom on its next turn.
            setTimeout(function () {
                current.classList.remove('is-leaving');
            }, 500);
        }, 2600);
        }
    }

    /* ---------------------------------------------------------------
       Hero: tilt the headshot toward the pointer.
       --------------------------------------------------------------- */
    function setupTilt() {
        var tilt = document.querySelector('.headshot-tilt');
        var hero = document.querySelector('.intro-section');
        if (!tilt || !hero || reduceMotion) return;
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

        var frame = null;

        hero.addEventListener('mousemove', function (e) {
            if (frame) return;
            frame = requestAnimationFrame(function () {
                frame = null;
                var box = hero.getBoundingClientRect();
                var x = (e.clientX - box.left) / box.width - 0.5;
                var y = (e.clientY - box.top) / box.height - 0.5;
                tilt.style.transform =
                    'perspective(900px) rotateY(' + (x * 12).toFixed(2) + 'deg) ' +
                    'rotateX(' + (-y * 12).toFixed(2) + 'deg)';
            });
        });

        hero.addEventListener('mouseleave', function () {
            tilt.style.transform = '';
        });
    }

    /* ---------------------------------------------------------------
       Thin progress bar showing how far down the page you are.
       --------------------------------------------------------------- */
    function setupScrollProgress() {
        var bar = document.createElement('div');
        bar.className = 'scroll-progress';
        var fill = document.createElement('span');
        bar.appendChild(fill);
        document.body.appendChild(bar);

        var ticking = false;

        function update() {
            ticking = false;
            var scrollable = document.documentElement.scrollHeight - window.innerHeight;
            var pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
            fill.style.width = Math.min(100, Math.max(0, pct)) + '%';
        }

        window.addEventListener('scroll', function () {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(update);
        }, { passive: true });

        window.addEventListener('resize', update);
        update();
    }

    /* ---------------------------------------------------------------
       Cover: drift the image slower than the page and fade the overlay
       out as it scrolls away.
       --------------------------------------------------------------- */
    function setupCoverParallax() {
        var cover = document.querySelector('.cover');
        var media = document.querySelector('.cover-media');
        if (!cover || !media || reduceMotion) return;

        var content = cover.querySelector('.cover-content');
        var cue = cover.querySelector('.scroll-cue');
        var ticking = false;

        // The cue fades in via a CSS animation, and a running animation
        // outranks inline styles — so hand control back once it finishes,
        // otherwise the scroll fade below would never apply.
        if (cue) {
            cue.addEventListener('animationend', function (e) {
                if (e.target !== cue) return;   // the chevron's own loop bubbles up
                cue.style.animation = 'none';
                update();
            });
        }

        function update() {
            ticking = false;
            var height = cover.offsetHeight || 1;
            var y = Math.min(window.scrollY, height);

            media.style.transform = 'translate3d(0, ' + (y * 0.32).toFixed(1) + 'px, 0)';

            var fade = Math.max(0, 1 - y / (height * 0.6));
            if (content) content.style.opacity = fade.toFixed(3);
            if (cue) cue.style.opacity = Math.max(0, 1 - y / (height * 0.25)).toFixed(3);
        }

        window.addEventListener('scroll', function () {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(update);
        }, { passive: true });

        window.addEventListener('resize', update);
        update();
    }

    /* ---------------------------------------------------------------
       Home page: the nav floats over the cover, then turns solid once
       the cover has scrolled past.
       --------------------------------------------------------------- */
    function setupNavOverlay() {
        if (!document.body.classList.contains('has-cover')) return;

        var nav = document.querySelector('.topnav');
        var cover = document.querySelector('.cover');
        if (!nav || !cover) return;

        var ticking = false;

        function update() {
            ticking = false;
            var trigger = cover.offsetHeight - nav.offsetHeight;
            nav.classList.toggle('is-stuck', window.scrollY > trigger);
        }

        window.addEventListener('scroll', function () {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(update);
        }, { passive: true });

        window.addEventListener('resize', update);
        update();
    }

    setupReveal();
    setupRotator();
    setupTilt();
    setupCoverParallax();
    setupNavOverlay();
    setupScrollProgress();
})();
