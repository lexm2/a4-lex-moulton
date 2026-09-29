Assignment 4 - Conspiracy Viability Calculator
===

Due: September 25th, by 1:59 PM.
https://a4-lex-moulton.onrender.com

Lex Moulton - WPI CS 4241 Assignment 4

A calculator for how long a conspiracy can stay secret, based on David Grimes' 2016 paper.
You enter a theory, how many conspirators it has and how long it's been running, and it tells you the chance that it has leaked and the time until it is almost certain to have leaked.

This is A3 with a D3 chart added. Each conspiracy is drawn as a curve of its chance of having leaked over time, over bands for the AIRTIGHT, HOLDING, LEAKING and BUSTED verdicts. The entry form and the chart controls both use Tweakpane.

## Instructions

Run `npm install`, put `MONGODB_URI` and `SESSION_SECRET` in a `.env`, then `npm start` and open `http://localhost:3000`.
Log in, press **New Conspiracy +** to open the entry form, fill in the fields then press **Add Conspiracy**. Press **Edit** to load that theory back into the form and change it, or **Delete** to remove it.

Move the mouse over the chart to see every theory's leak chance at that year, or click the chart and use the arrow keys. Hover over a card to highlight its curve, or press **Only this** to draw just that theory. **Show all** brings the rest back.

The chart controls:
- **leak rate**: leaks per million people per year. Grimes measured 4.09, and **Reset to Grimes rate** puts it back. This only changes the chart, not the cards.
- **years shown**: how many years the chart covers.
- **log time**: spreads out the first few years, where the big conspiracies leak.
- **today dots**: mark where each theory is now.

## Challenges

- Big conspiracies leak within a couple of years, so on a normal time axis their curves were squashed against the left edge. Log time is on by default to spread them out.
- Pico CSS styles every `input` and `select`, which broke Tweakpane's inputs. I added overrides so Tweakpane's own styles win.
- Four category colors couldn't be told apart by viewers, so Government, Corporate and Science get colors and Other is gray.
