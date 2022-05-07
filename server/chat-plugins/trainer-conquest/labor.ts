import {TCFacility} from "./facilities";
import {TCKingdom, TCTrainer} from "./game-objects";

export abstract class TCLabor {
	kingdom: TCKingdom;
	startup: number;
	activeCount: number;
	cooldown: number;
	sabotageCount: number;
	rank: 1 | 2 | 3;

	abstract name: string;

	readonly startupTime: [number, number, number] = [0, 0, 0];
	abstract readonly activeTime: [number, number, number];
	abstract readonly cooldownTime: [number, number, number];

	constructor(kingdom: TCKingdom) {
		this.kingdom = kingdom;
		this.startup = 0;
		this.activeCount = 0;
		this.cooldown = 0;
		this.sabotageCount = 0;
		this.rank = 1;
	}

	get active() {
		return this.startup <= 0 && this.activeCount > 0 && this.sabotageCount <= 0;
	}

	canActivate() {
		return this.activeCount <= 0 && this.cooldown <= 0 && this.sabotageCount <= 0;
	}

	setCountdowns() {
		this.startup = this.startupTime[this.rank - 1];
		this.activeCount = this.activeTime[this.rank - 1];
		this.cooldown = this.activeTime[this.rank - 1];
	}

	abstract showDialog(trainer?: TCTrainer, args?: string[]): void;
	abstract activate(trainer: TCTrainer, args: string[]): void;

	destroy() {
		this.kingdom = null!;
	}
}

class TCTransport extends TCLabor {
	connectedKingdoms: TCKingdom[];

	readonly startupTime: [number, number, number] = [4, 3, 3];
	readonly activeTime: [number, number, number] = [5, 6, 6];
	readonly cooldownTime: [number, number, number] = [4, 3, 3];

	constructor(kingdom: TCKingdom) {
		super(kingdom);
		this.connectedKingdoms = [];
	}
}

class TCConstruction extends TCLabor {
	temporaryFacility: TCFacility | null;

	readonly activeTime: [number, number, number] = [18, 14, 8];
	readonly cooldownTime: [number, number, number] = [12, 8, 4];

	constructor(kingdom: TCKingdom) {
		super(kingdom);
		this.temporaryFacility = null;
	}
}

class TCConvoy extends TCLabor {
	kingdomPath: TCKingdom[];

	readonly activeTime: [number, number, number] = [4, 8, 13];
	readonly cooldownTime: [number, number, number] = [4, 3, 3];

	constructor(kingdom: TCKingdom) {
		super(kingdom);
		this.kingdomPath = [];
	}

	get currentKingdom() {
		return this.kingdomPath[this.kingdomPath.length - this.activeCount];
	}
}

class TCDefenders extends TCLabor {
	readonly activeTime: [number, number, number] = [4, 6, 10];
	readonly cooldownTime: [number, number, number] = [4, 4, 3];
}

class TCScout extends TCLabor {
	targetKingdom: TCKingdom | null;

	readonly startupTime: [number, number, number] = [3, 2, 2];
	readonly activeTime: [number, number, number] = [3, 3, 3];
	readonly cooldownTime: [number, number, number] = [4, 3, 3];

	constructor(kingdom: TCKingdom) {
		super(kingdom);
		this.targetKingdom = null;
	}
}

export const LABOR_TABLE: {[k: string]: new (kingdom: TCKingdom) => TCLabor} = {
	'transport': TCTransport,
	'construction': TCConstruction,
	'convoy': TCConvoy,
	'defenders': TCDefenders,
	'scout': TCScout,
};
