export class CoorinateSetWithString {
    coodinates: Set<string> = new Set()

    convertCoordinateToString(h:number, w:number):string{
        return `${h}-${w}`
    }

    convertStringToCoordinate(coordinateString:string):[number, number] {
        const [hString, wString] = coordinateString.split("-")
        if (typeof hString === "undefined" || typeof wString === "undefined") {
            return [NaN, NaN]
        }
        return [parseInt(hString, 10), parseInt(wString, 10)]
    }

    add(h:number, w:number) {
        const coordinateString = this.convertCoordinateToString(h, w)
        this.coodinates.add(coordinateString)
    }

    has(h:number, w:number):boolean{
        const coordinateString = this.convertCoordinateToString(h, w)
        return this.coodinates.has(coordinateString)
    }

    listAllCoordinates():[number, number][] {
        const allCoodinatesList: [number, number][] = []

        for (const entry of this.coodinates.values()) {
            const [h, w] = this.convertStringToCoordinate(entry)
            allCoodinatesList.push([h, w])
        }
        return allCoodinatesList
    }
}