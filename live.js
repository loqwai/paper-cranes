import { render } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { html } from 'htm/preact'
import './src/midi.js'
import { loadShaders } from './src/shader-list.js'
import { ShaderListItem } from './src/shader-list-item.js'
// Communication channel between windows
const channel = new BroadcastChannel('paper-cranes-live');

const LiveControl = () => {
    const [shaders, setShaders] = useState([]);
    const [currentShader, setCurrentShader] = useState(null);
    const [visualizerWindow, setVisualizerWindow] = useState(null);

    useEffect(() => {
        // Load shaders on mount
        loadShaders().then(setShaders);

        // Listen for messages from visualizer
        channel.onmessage = (event) => {
            const { type } = event.data;
            if (type === 'visualizer_ready' && currentShader) {
                selectShader(currentShader);
            }
        };
    }, []);
    /**
     * Select a shader
     * @typedef {Object} Shader
     * @property {string} name - The name of the shader
     * @property {string} visualizerQueryParam - The query parameter to use to select the shader
     * @param {Shader} shader - The shader to select
     */
    const selectShader = (shader) => {
        console.log('selectShader', shader);
        setCurrentShader(shader);
        channel.postMessage({
            type: 'shader_update',
            shader: shader.visualizerQueryParam
        });
    };

    const selectPreset = (presetUrl) => {
        try {
            const url = new URL(presetUrl)
            // Extract all parameters from the preset URL
            const params = Array.from(url.searchParams.entries())
            // Send each parameter to the visualizer
            params.forEach(([key, value]) => {
                if (key !== 'shader') {
                    channel.postMessage({
                        type: 'knob_update',
                        knobId: key,
                        value: parseFloat(value)
                    })
                }
            })
        } catch (error) {
            console.error('Failed to apply preset:', error)
        }
    }

    const launchVisualizer = () => {
        if (visualizerWindow && !visualizerWindow.closed) {
            visualizerWindow.focus();
            return;
        }

        const params = new URLSearchParams({
            live: 'true',
            shader: currentShader?.visualizerQueryParam || 'default'
        });

        const newWindow = window.open(
            `/?${params.toString()}`,
            'paper-cranes-visualizer',
            'width=800,height=600'
        );
        setVisualizerWindow(newWindow);
    };

    return html`
        <div class="container">
            <div class="button-group">
                <button onClick=${launchVisualizer}>Launch Visualizer</button>
            </div>
            <ul class="shader-list">
                ${shaders.map(shader => html`
                    <${ShaderListItem}
                        ...${shader}
                        isActive=${shader === currentShader}
                        onClick=${handleClick}
                    />
                `)}
            </ul>
        </div>
    `;
};

// Render the app
render(html`<${LiveControl} />`, document.body);
