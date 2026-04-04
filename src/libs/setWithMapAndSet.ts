export class CoorinateSetWithMapAndSet {
    coodinates: Map<number, Set<number>> = new Map()

    add(h:number, w:number) {
        if (!this.coodinates.has(h)) {
            this.coodinates.set(h, new Set())
        }
        this.coodinates.get(h)?.add(w)
    }

    has(h:number, w:number):boolean{
        const wValuesRelatedToh = this.coodinates.get(h)

        if (typeof wValuesRelatedToh === "undefined") {
            return false
        }

        return wValuesRelatedToh.has(w)
    }

    listAllCoordinates():[number, number][] {
        const allCoodinatesList: [number, number][] = []

        for (const entry of this.coodinates.entries()) {
            for (const wValue of entry[1]) {
                allCoodinatesList.push([entry[0], wValue])
            }
        }

        return allCoodinatesList
    }
}