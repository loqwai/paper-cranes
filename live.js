import { render } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { html } from 'htm/preact'
import './src/midi.js'
// Communication channel between windows
const channel = new BroadcastChannel('paper-cranes-live');

const LiveControl = () => {
    const [shaders, setShaders] = useState([]);
    const [currentShader, setCurrentShader] = useState(null);
    const [visualizerWindow, setVisualizerWindow] = useState(null);

    useEffect(() => {
        // Load shaders on mount
        fetch('shaders.json')
            .then(res => res.json())
            .then(shaderList => setShaders(shaderList))
            .catch(error => {
                console.error('Failed to load shaders:', error);
                // Fallback shaders
                setShaders([
                    { name: 'Default', path: 'default' },
                    { name: 'Gummy Crystals', path: 'redaphid/wip/gummy-crystals' },
                    { name: 'Rainbow Wave', path: 'redaphid/rainbow-waves/ableton' }
                ]);
            });

        // Listen for messages from visualizer
        channel.onmessage = (event) => {
            const { type } = event.data;
            if (type === 'visualizer_ready' && currentShader) {
                selectShader(currentShader);
            }
        };
    }, []);

    const selectShader = (shader) => {
        console.log('selectShader', shader)
        setCurrentShader(shader);
        channel.postMessage({
            type: 'shader_update',
            shader: shader.visualizerQueryParam
        });
    };

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
            <div class="playlist">
                <h2>Shader Playlist</h2>
                ${shaders.map(shader => html`
                    <div
                        class="playlist-item ${shader.fileUrl === currentShader ? 'active' : ''}"
                        onClick=${() => selectShader(shader)}
                    >
                        ${shader.name}
                    </div>
                `)}
            </div>
            <div class="controls">
                <div class="button-group">
                    <button onClick=${launchVisualizer}>Launch Visualizer</button>
                </div>
            </div>
        </div>
    `;
};

// Render the app
render(html`<${LiveControl} />`, document.body);
