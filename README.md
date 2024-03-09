# Beadfamous

Welcome to the Beadfamous project! This repo is an open-source project I made to do advanced audio analysis from a microphone in the browser, and drive arbitrary music visualizations with the data. The project can run on mobile phones, and is designed to make it easy to create new visualizations and share them with others.

The other half of the project is a sort of "art project" where you make bead bracelets, and flash the visualizations onto them. This is a fun way to share your visualizations with others, and to make a physical object that represents your music. Scanning the bracelet with a phone will take you to a specific visualization - even when offline!

## Usage

If you've done web development before, the following steps should be pretty familiar.

1. `npm install`
2. `npm run dev`

This will serve beadfamous on localhost:6969

## Viewing the visualizations

visualizations are specified by the query param 'shader' in the url. For example, to view the 'star' visualization, you would go to [localhost:6969/?shader=star](http://localhost:6969/?shader=star)

Behind the scenes, this loads code for what's called a 'shader' from the `shaders/` directory. These are written in GLSL, and are the code that actually runs on the GPU to make the visualizations. In the above example, the 'star' visualization is defined in `shaders/star.frag`. You can look at other files in the `shaders/` directory to see which visualizations are available.

This project is deployed at [visuals.beadfamous.com](https://visuals.beadfamous.com), and you can view the visualizations there as well.

## Making your own visualizations

Making your own visualization is easy, but requires some knowledge of GLSL shading language.
Lucky for you, I'm hosting a hackathon with HeatSync Labs next month, in which we go from nothing to a working visualization and bracelet in a couple of hours next month! Stay tuned for more details.

To make your own visualizations, you can create a new file in the `shaders/` directory, and then load it by specifying the 'shader' query param in the url. For example, to view the 'my_new_shader' visualization, you would go to [localhost:6969/?shader=my_new_shader](http://localhost:6969/?shader=my_new_shader)

You can copy and paste any of the existing files in the `shaders/` directory to get started. Or ya know, wait until the Hackathon and I'll walk you through it.

If you want to deploy a visualization you made, PR me and I'll add it to the deployed site!
