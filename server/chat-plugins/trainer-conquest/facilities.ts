import {TCTrainer, TCKingdom, TCPokemon} from './game-objects';

export abstract class TCFacility {
	kingdom: TCKingdom;
	cooldown: number;
	sabotageCount: number;

	onNewMonth(): void {}

	decrementCooldowns() {
		if (this.sabotageCount > 0) this.sabotageCount--;
		else if (this.cooldown > 0) this.cooldown--;
	}

	abstract showDialog(trainer: TCTrainer): void;

	constructor(kingdom: TCKingdom) {
		this.kingdom = kingdom;
		this.cooldown = 0;
		this.sabotageCount = 0;
	}
}

export abstract class TCBaseItemShop extends TCFacility {
	availableItems: ID[];

	constructor(kingdom: TCKingdom) {
		super(kingdom);
		this.availableItems = [];
	}

	abstract onNewMonth(): void;
}

export abstract class TCMoveTutor extends TCFacility {
	availableMoves: ID[];

	constructor(kingdom: TCKingdom) {
		super(kingdom);
		this.availableMoves = [];
	}

	abstract onNewMonth(): void;
}

export class TCFarmersMarket extends TCBaseItemShop {

}

export class TCTechniqueTutor extends TCMoveTutor {

}

export class TCBonusShrine extends TCFacility {

}

export class TCTradeCenter extends TCFacility {

}

export class TCCommunications extends TCFacility {

}

export class TCTomb extends TCBaseItemShop {

}

export class TCMysticForest extends TCFacility {

}

export class TCHiddenDojo extends TCFacility {

}

export class TCPowerGym extends TCFacility {

}

export class TCWeaponsShop extends TCBaseItemShop {

}

export class TCRelicClass extends TCMoveTutor {

}

export class TCDayCare extends TCFacility {
	egg: TCPokemon | null;

	constructor(kingdom: TCKingdom) {
		super(kingdom);
		this.egg = null;
	}
}

export class TCFestival extends TCFacility {

}

export class TCItemShop extends TCBaseItemShop {

}

export class TCHermitage extends TCFacility {

}

export class TCRecruitmentCenter extends TCFacility {

}

export class TCRecon extends TCFacility {

}

export class TCShelter extends TCFacility {

}

export class TCPark extends TCFacility {

}

