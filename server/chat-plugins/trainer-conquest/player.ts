import {TrainerConquest} from "./game";

export class TrainerConquestPlayer extends Rooms.RoomGamePlayer<TrainerConquest> {
	resultText: string;
	pageHTML: string;

	constructor(user: string | User | null, game: TrainerConquest) {
		super(user, game);
		this.resultText = '';
		this.pageHTML = '';
	}

	resetPage() {
		const user = Users.get(this.id);
		if (!user?.connected) return;
		for (const conn of user.connections) {
			if (conn.openPages) {
				for (const page of conn.openPages) {
					if (page.startsWith(`trainerconquest-${this.game.room.roomid}`)) {
						conn.send(`>view-${page}\n|deinit`);
						conn.openPages.delete(page);
					}
				}
				if (!conn.openPages.size) {
					conn.openPages = null;
				}
			}
			void Chat.resolvePage(`view-trainerconquest-${this.game.room.roomid}`, user, conn);
		}
	}
}
