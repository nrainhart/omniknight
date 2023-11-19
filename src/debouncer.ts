export class Debouncer {
	private timerId?: number;
	private initialTime?: Date;
	debounce(callback: any, debounceMs: number, runAfter: number) {
		if (this.timerId && this.isOtherRunningInTheSameInterval(runAfter)) {
			clearTimeout(this.timerId);
		} else {
			this.initialTime = new Date();
			this.timerId = null;
		}
		this.timerId = setTimeout(() => {
			callback();
			this.initialTime = null;
		}, debounceMs);
	}
	private isOtherRunningInTheSameInterval(runAfter: number) {
		const now = new Date();
		const x =
			this.initialTime && this.initialTime.getTime() + runAfter > now.getTime();
		return x;
	}
}
