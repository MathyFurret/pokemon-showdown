import { TrainerConquest } from "./game";
import { TrainerConquestPlayer } from "./player";

export class TCKingdom {
	game: TrainerConquest;
	neighbors: TCKingdom[];
	owner: TrainerConquestPlayer | null;

	constructor(game: TrainerConquest) {
		this.game = game;
		this.neighbors = [];
		this.owner = null;
	}
}

export class TCTrainer {
	game: TrainerConquest;
	owner: TrainerConquestPlayer | null;
	kingdom: TCKingdom;
	name: string;
	party: TCPokemon[];
	// signature: TCPokemon;
	rank: 1 | 2 | 3;
	isLost: boolean;
	items: ID[];

	constructor(name: string, kingdom: TCKingdom) {
		this.game = kingdom.game;
		this.owner = kingdom.owner;
		this.kingdom = kingdom;
		this.name = name;
		this.party = [];
		this.rank = 1;
		this.isLost = false;
		this.items = [];
	}

	get signature() {
		return this.party[0];
	}

	getPackedTeam(): string {
		// TODO

		return '';
	}
}

export class TCPokemon {
	game: TrainerConquest;
	trainer: TCTrainer;
	isSignature: boolean;
	species: Species;
	level: number;
	evs: StatsTable;
	ivs: StatsTable;
	friendship: number;
	ability: string;
	item: ID;
	tutoredMoves: ID[];
	fainted: boolean;

	constructor(trainer: TCTrainer, species: string, isSignature: boolean = false) {
		this.trainer = trainer;
		this.game = trainer.game;
		this.isSignature = isSignature;

		this.species = this.game.dex.species.get(species);
		if (!this.species.exists) throw new Error(`Species ${species} does not exist`);

		this.level = 5;
		this.evs = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0};
		this.ivs = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0};
		this.friendship = 0;
		this.item = '';
		this.tutoredMoves = [];

		if (this.species.abilities[1]) {
			this.ability = Math.floor(Math.random() * 2) ? this.species.abilities[1] : this.species.abilities[0];
		} else {
			this.ability = this.species.abilities[0];
		}

		if (isSignature) {
			this.incrementAllIVs();
		}

		this.fainted = false;
	}

	incrementAllIVs() {
		let stat: StatID;
		for (stat in this.ivs) this.ivs[stat]++;
	}

	tryLevelUp(n = 1) {
		let maxLevel = 100;
		switch (this.trainer.rank) {
			case 1:
				maxLevel = 25;
				break;
			case 2:
				maxLevel = 50;
				break;
		}
		if (!this.isSignature && this.trainer.signature.level < maxLevel) 
			maxLevel = this.trainer.signature.level;
		
		this.level = Math.min(this.level + n, maxLevel);
	}
}
