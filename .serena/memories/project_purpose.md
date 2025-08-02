# Project Purpose and Goals

## What This Project Is
This is an offline-first Gantt chart application built for Excel-like task management with advanced dependency relationships.

## Primary Goal
Create a lightweight, browser-based project management tool that overcomes Excel's limitations for Gantt charts - specifically slow performance with 200+ rows and poor overview capability.

## Key Differentiators
- **Direct Chart Manipulation**: Double-click to create, drag to move/adjust, right-click to delete
- **Complex Dependencies**: Supports `after,-x,n` (start n days after x rows above) and `sameas,-x` (same start as x rows above)
- **Holiday-Aware Scheduling**: Automatically avoids weekends/holidays in date calculations
- **Scalable Performance**: Handles up to 1000 tasks smoothly
- **Adjustable Granularity**: Chart width adjustable in 0.5px increments for long-term project overview

## Target Users
- Project managers frustrated with Excel Gantt chart limitations
- Teams needing offline project management tools
- Users requiring complex task dependency management

## Platform Requirements
- **Chromium-based browsers only** (Chrome/Edge)
- **Desktop only** (no mobile support planned)
- **Offline-first** design (no cloud dependencies)