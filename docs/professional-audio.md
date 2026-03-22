# Using Virtual Audio Loopback for Clean Computer Audio

Instead of pointing a microphone at your speakers, you can route your computer's audio output directly into the browser. This eliminates room noise, mic bleed, and latency — the visualizations respond to the pure digital signal.

## How It Works

A virtual audio loopback driver creates a fake audio device that captures whatever your system is playing and makes it available as a microphone input. You select it as the mic source in the browser, and Paper Cranes receives clean audio with no hardware in the loop.

## macOS — BlackHole

[BlackHole](https://existential.audio/blackhole/) is a free, open-source virtual audio driver.

### Install

```bash
brew install blackhole-2ch
```

Or download the installer from the BlackHole website.

### Setup

1. Open **Audio MIDI Setup** (search it in Spotlight)
2. Click **+** at the bottom left → **Create Multi-Output Device**
3. Check both **BlackHole 2ch** and your regular output (speakers/headphones)
4. Set this Multi-Output Device as your system output in **System Settings → Sound → Output**

Now audio plays through your speakers *and* gets captured by BlackHole simultaneously.

5. In your browser, when Paper Cranes asks for microphone access, select **BlackHole 2ch** as the input

### Tips

- If the visualizer seems quiet, check that your system volume isn't low — BlackHole captures the post-volume signal
- You can rename the Multi-Output Device to something memorable like "Speakers + Loopback"
- BlackHole adds zero latency — it's a direct in-kernel passthrough

---

## Windows — Voicemeeter

[Voicemeeter](https://vb-audio.com/Voicemeeter/) (free) is a virtual audio mixer that includes loopback functionality.

### Install

Download and install Voicemeeter from the VB-Audio website. Restart when prompted — the virtual drivers need a reboot to register.

### Setup

1. Open Voicemeeter
2. In **HARDWARE OUT A1**, select your real output device (speakers or headphones)
3. Set **Voicemeeter Input** (or **Voicemeeter VAIO**) as your Windows default playback device:
   - Right-click the speaker tray icon → **Sound settings** → set Voicemeeter as default output
4. Make sure the **A1** button is lit on the Voicemeeter Input strip so audio routes to your speakers

Now Voicemeeter sits between your apps and your speakers, and its **Output B1** acts as a loopback capture.

5. In your browser, select **Voicemeeter Output** (or **VB-Audio Virtual Cable**) as the microphone input

### Tips

- **Voicemeeter Banana** (also free) adds more routing options if you need finer control
- If you hear echo or feedback, make sure the browser tab with Paper Cranes isn't also routing through Voicemeeter as output
- Keep the Voicemeeter window open while using it — closing it removes the virtual devices

---

## Browser Permission Note

Browsers treat loopback devices as microphones. When Paper Cranes requests mic access, click **Allow** and then pick the loopback device from the dropdown (if your browser shows one — Chrome does, Safari may not). If the browser doesn't show a device picker, go to your browser's site settings and change the microphone for the site.
