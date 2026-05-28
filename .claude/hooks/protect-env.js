#!/usr/bin/env node
async function main() {
	const chunks = [];
	for await (const chunk of process.stdin) chunks.push(chunk);
	const data = JSON.parse(Buffer.concat(chunks).toString());

	const ti = data.tool_input || {};
	const target = ti.file_path || ti.path || ti.pattern || "";

	if (/\.env(\.|$|\/)/.test(target) || target.includes(".env")) {
		console.error(
			"Blocked: access to .env files is prohibited by a security hook.",
		);
		process.exit(2);
	}
	process.exit(0);
}
main();
