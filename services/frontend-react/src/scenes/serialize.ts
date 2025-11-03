import type { StoreApi } from 'zustand'
import type { ModuleStore, ModuleState } from './createNewConfiguratorModule'

export type ConfiguratorState = {
    version: '1'
    dimensions: ModuleState['dimensions']
    columns: ModuleState['columns']
    shelves: ModuleState['shelves']
    doors: ModuleState['doors']
    columnThickness: number
    shelfThickness: number
    frameThickness: number
    doorThickness: number
    materials: ModuleState['materials']
    selectedMaterialKey: ModuleState['selectedMaterialKey']
    woodParams: ModuleState['woodParams']
    selectedGenus: string
    selectedFinish: string
    hoveredId: ModuleState['hoveredId']
    selectedId: ModuleState['selectedId']
}

export function serializeModuleStore(store: StoreApi<ModuleStore>): ConfiguratorState {
    const s = store.getState()
    return {
        version: '1',
        dimensions: s.dimensions,
        columns: s.columns,
        shelves: s.shelves,
        doors: s.doors,
        columnThickness: s.columnThickness,
        shelfThickness: s.shelfThickness,
        doorThickness: s.doorThickness,
        frameThickness: s.frameThickness,
        materials: s.materials,
        selectedMaterialKey: s.selectedMaterialKey,
        woodParams: s.woodParams,
        selectedGenus: s.selectedGenus ?? 'white_oak',
        selectedFinish: s.selectedFinish ?? 'matte',
        hoveredId: s.hoveredId,
        selectedId: s.selectedId,
    }
}

export function applySerializedState(snapshot: ConfiguratorState, store: StoreApi<ModuleStore>) {
    const s = store.getState()
    console.log('applySerializedState - incoming snapshot:', snapshot)

    s.setDimensions(snapshot.dimensions)
    s.setFrameThickness(snapshot.frameThickness)
    s.setColumnThickness(snapshot.columnThickness)
    s.setShelfThickness(snapshot.shelfThickness)
    s.setDoorThickness(snapshot.doorThickness)

    s.setColumnsEven(0)
    s.setShelvesEven(0)
    s.setDoorsEven(0)

    console.log('applySerializedState - adding columns:', snapshot.columns)
    snapshot.columns.forEach(c => s.addColumn(c.x, c.width))
    const cols = store.getState().columns
    cols.forEach((c, i) => { if (snapshot.columns[i]) s.moveColumn(c.id, snapshot.columns[i]!.x) })

    console.log('applySerializedState - adding shelves:', snapshot.shelves)
    snapshot.shelves.forEach(sh => s.addShelf(sh.y))

    console.log('applySerializedState - adding doors:', snapshot.doors)
    snapshot.doors.forEach(d => s.addDoor(d.x, d.width))
    const drs = store.getState().doors
    drs.forEach((d, i) => { if (snapshot.doors[i]) s.moveDoor(d.id, snapshot.doors[i]!.x) })

    console.log('applySerializedState - final state:', store.getState())

    s.setWoodParams(snapshot.woodParams)
    if (snapshot.selectedGenus && snapshot.selectedFinish) s.applyPreset(snapshot.selectedGenus, snapshot.selectedFinish)
    if (snapshot.selectedMaterialKey) s.setSelectedMaterial(snapshot.selectedMaterialKey)
    s.setHovered(snapshot.hoveredId)
    s.setSelected(snapshot.selectedId)
}


