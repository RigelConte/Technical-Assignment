import type { Request, Response } from 'express';
import { parseIntent, validateIntent } from '../services/nlp.service';
import { query } from '../db/client';
import { ConfiguratorStateZ } from '../schemas/configuratorState';

export async function processCommand(req: Request, res: Response) {
  const { command, stateId, currentState } = req.body;

  if (!command || typeof command !== 'string') {
    return res.status(400).json({
      error: 'validation_error',
      message: 'Command text is required'
    });
  }

  const intent = await parseIntent(command);

  if (intent.confidence < 0.7 || intent.action === 'unknown') {
    return res.json({
      success: false,
      intent,
      message: intent.clarification || 'Could not understand command'
    });
  }

  const validation = validateIntent(intent);
  if (!validation.valid) {
    return res.json({
      success: false,
      intent,
      message: validation.error
    });
  }

  try {
    let stateToModify;

    if (currentState) {
      // Use the provided current state from frontend
      const parsed = ConfiguratorStateZ.safeParse(currentState);
      if (!parsed.success) {
        return res.status(400).json({ error: 'invalid_state', message: 'Current state is invalid' });
      }
      stateToModify = parsed.data;
    } else if (stateId) {
      // Fallback to fetching from database
      const { rows } = await query(
        'SELECT id, state FROM configurator_states WHERE id = $1',
        [stateId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'not_found', message: 'State not found' });
      }

      const parsed = ConfiguratorStateZ.safeParse(rows[0].state);
      if (!parsed.success) {
        return res.status(500).json({ error: 'invalid_state', message: 'Stored state is invalid' });
      }
      stateToModify = parsed.data;
    } else {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Either currentState or stateId is required'
      });
    }

    const newState = applyIntent(stateToModify, intent);

    // Only update database if stateId was provided
    if (stateId) {
      await query(
        'UPDATE configurator_states SET state = $1, updated_at = now() WHERE id = $2',
        [newState, stateId]
      );
    }

    return res.json({
      success: true,
      intent,
      message: 'Command applied successfully',
      state: newState
    });

  } catch (error) {
    console.error('Error applying command:', error);
    return res.status(500).json({
      error: 'server_error',
      message: 'Failed to apply command'
    });
  }
}

function applyIntent(state: any, intent: any): any {
  const newState = JSON.parse(JSON.stringify(state));

  switch (intent.action) {
    case 'add_door': {
      const count = intent.parameters.count || 1;
      const currentDoorCount = newState.doors?.length || 0;

      if (!newState.doors) {
        newState.doors = [];
      }

      const width = newState.dimensions?.width || 1.8;
      const doorThickness = newState.doorThickness || 0.02;
      const minSpacing = 0.10;

      const totalDoors = currentDoorCount + count;

      const x0 = doorThickness;
      const x1 = width - doorThickness;
      const W = x1 - x0;

      const defaultDoorWidth = newState.doors[0]?.width ?? doorThickness;
      const doorWidth = defaultDoorWidth;

      const gap = Math.max(minSpacing, (W - totalDoors * doorWidth) / (totalDoors + 1));

      for (let i = 0; i < count; i++) {
        const doorIndex = currentDoorCount + i;
        const x = x0 + gap * (doorIndex + 1) + doorWidth * doorIndex;
        newState.doors.push({
          id: `door-${Date.now()}-${i}`,
          x: x,
          width: doorWidth
        });
      }

      for (let i = 0; i < currentDoorCount; i++) {
        const x = x0 + gap * (i + 1) + doorWidth * i;
        newState.doors[i].x = x;
        newState.doors[i].width = doorWidth;
      }
      break;
    }

    case 'remove_door': {
      const count = intent.parameters.count || 1;
      if (newState.doors?.length > 0) {
        for (let i = 0; i < count && newState.doors.length > 0; i++) {
          newState.doors.pop();
        }

        if (newState.doors.length > 0) {
          const width = newState.dimensions?.width || 1.8;
          const doorThickness = newState.doorThickness || 0.02;
          const minSpacing = 0.10;

          const x0 = doorThickness;
          const x1 = width - doorThickness;
          const W = x1 - x0;

          const doorWidth = newState.doors[0].width;
          const gap = Math.max(minSpacing, (W - newState.doors.length * doorWidth) / (newState.doors.length + 1));

          for (let i = 0; i < newState.doors.length; i++) {
            const x = x0 + gap * (i + 1) + doorWidth * i;
            newState.doors[i].x = x;
            newState.doors[i].width = doorWidth;
          }
        }
      }
      break;
    }

    case 'add_shelf': {
      const count = intent.parameters.count || 1;
      const currentShelfCount = newState.shelves?.length || 0;

      if (!newState.shelves) {
        newState.shelves = [];
      }

      const height = newState.dimensions?.height || 2.2;
      const frameThickness = newState.frameThickness || 0.02;
      const shelfThickness = newState.shelfThickness || 0.02;
      const minSpacing = 0.04;

      const totalShelves = currentShelfCount + count;
      const availableHeight = height - 2 * frameThickness;
      const shelfHalf = shelfThickness / 2;
      const start = frameThickness + shelfHalf + minSpacing;
      const end = height - frameThickness - shelfHalf - minSpacing;
      const step = (end - start) / (totalShelves + 1);

      for (let i = 0; i < count; i++) {
        const shelfIndex = currentShelfCount + i;
        const y = start + step * (shelfIndex + 1);
        newState.shelves.push({
          id: `shelf-${Date.now()}-${i}`,
          y: y
        });
      }
      break;
    }

    case 'remove_shelf': {
      const count = intent.parameters.count || 1;
      if (newState.shelves?.length > 0) {
        for (let i = 0; i < count && newState.shelves.length > 0; i++) {
          newState.shelves.pop();
        }
      }
      break;
    }

    case 'add_column': {
      const count = intent.parameters.count || 1;
      const currentColumnCount = newState.columns?.length || 0;

      if (!newState.columns) {
        newState.columns = [];
      }

      const width = newState.dimensions?.width || 1.8;
      const frameThickness = newState.frameThickness || 0.02;
      const columnWidth = 0.02;
      const minSpacing = 0.1;

      const totalColumns = currentColumnCount + count;
      const availableWidth = width - 2 * frameThickness;
      const totalSpacing = minSpacing * (totalColumns + 1);
      const sectionWidth = (availableWidth - totalSpacing) / totalColumns;

      for (let i = 0; i < count; i++) {
        const columnIndex = currentColumnCount + i;
        const x = frameThickness + minSpacing * (columnIndex + 1) + sectionWidth * columnIndex;
        newState.columns.push({
          id: `column-${Date.now()}-${i}`,
          x: x
        });
      }

      for (let i = 0; i < currentColumnCount; i++) {
        const x = frameThickness + minSpacing * (i + 1) + sectionWidth * i;
        newState.columns[i].x = x;
      }
      break;
    }

    case 'remove_column': {
      const count = intent.parameters.count || 1;
      if (newState.columns?.length > 0) {
        for (let i = 0; i < count && newState.columns.length > 0; i++) {
          newState.columns.pop();
        }

        if (newState.columns.length > 0) {
          const width = newState.dimensions?.width || 1.8;
          const frameThickness = newState.frameThickness || 0.02;
          const minSpacing = 0.1;
          const availableWidth = width - 2 * frameThickness;
          const totalSpacing = minSpacing * (newState.columns.length + 1);
          const sectionWidth = (availableWidth - totalSpacing) / newState.columns.length;

          for (let i = 0; i < newState.columns.length; i++) {
            const x = frameThickness + minSpacing * (i + 1) + sectionWidth * i;
            newState.columns[i].x = x;
          }
        }
      }
      break;
    }

    case 'change_material': {
      newState.material = intent.parameters.material;
      break;
    }

    case 'set_dimensions':
    case 'modify_grid': {
      if (!newState.dimensions) {
        newState.dimensions = { width: 2, height: 2.4, depth: 0.6 };
      }
      if (intent.parameters.width !== undefined) {
        newState.dimensions.width = intent.parameters.width / 100;
      }
      if (intent.parameters.height !== undefined) {
        newState.dimensions.height = intent.parameters.height / 100;
      }
      if (intent.parameters.depth !== undefined) {
        newState.dimensions.depth = intent.parameters.depth / 100;
      }
      break;
    }
  }

  return newState;
}
