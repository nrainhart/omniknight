declare interface Env {
	channels: DurableObjectNamespace;
}

declare module "*.html" {
	const content: string;
	export default content;
}
