# rubiks-cube
GCube, a WebGL Rubik's Cube

## Development status update
There is currenntly no development by owner blonkm.

* Feature status: complete freeze; no function or API change

* Code status: partial freeze; just fixes/typos or documentation updates; no extentions for other boards; no new examples

* Maintenance status: sporadically

The WebGL cube is now usable enough for embedding on any site. The biggest hurdle is the current use of older WebGL code. Upgrading would almost require a rewrite of the entire code base, and preferably a change to Three.js. You can still commit changes and pull requests, I will investigate any proposal.

## History
Java used to be the go-to solution for Rubik's cube applets (no pun intended with the Go-To). The last couple of years people 
have gotten used to HTML5+CSS3 which gives a very slick experience in regular browsers. Browsers are not plain text, links and 
images anymore. They have become so much more.

One of the last frontiers of the browser is 3D. We now have the canvas element in modern browsers, and with it we start 
experiencing more 3D. SVG didn't bring what was promised as far as 3D was concerned. Flash has died, killed by Apple, and now
Android. The only alternative left is 'native' browser code with javascript.

Fortunately the browsers have become up to speed lately, even IE. And with multiple cores in our systems, performance shouldn't 
be a problem. In a couple of years I am assuming that the same technologies will come to the mobile browsers with enough
CPU and GPU speed.

## Online Cubes and their issues
The two most popular solutions
online suffer from several issues: Randelshofer's CubeTwister is beautiful, but has a complex API and is not in active
development anymore. Lucas Garron's twisty.js is fast but doesn't look as nice and isn't easily 'pluggable' in a page. The main 
problem with all Java applets is that browsers are starting to block any plugins for security issues. The many updates of Java
don't really help either.

## Plans for development
The GCube project will ultimately be a full replacement for online cube algorithm demonstrations. The cubes will be easily 
pluggable in either a static website, a PHP site, or a WordPress blog (using a plugin). It will include tools for working
with algorithms (inverse, mirror, etc), and the cube stickers will be configurable. Also it will be configurable with
an initial algorithm, either in Generator or Solver mode (inverse).

## Special thanks
Special thanks go to Tiffany Wang for her beautiful cube.
