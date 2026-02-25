import type { Config } from '../types/Config/index.js';

export const INITIAL_CONFIG: Config = {
    version: 2,
    aliases: {
        dev: {
            description: 'Start development server / environment',
            rules: [
                { match: { file: 'bun.lockb' }, command: 'bun run dev' },
                { match: { file: 'pnpm-lock.yaml' }, command: 'pnpm dev' },
                { match: { file: 'yarn.lock' }, command: 'yarn dev' },
                { match: { file: 'package.json' }, command: 'npm run dev' },
                { match: { file: 'Cargo.toml' }, command: 'cargo run' },
                { match: { file: 'main.go' }, command: 'go run .' },
                { match: { file: 'manage.py' }, command: 'python manage.py runserver' },
                { match: { file: 'artisan' }, command: 'php artisan serve' },
                { match: { file: 'composer.json' }, command: 'composer run start' },
            ],
            fallback:
                "echo 'No development environment detected (missing package.json, Cargo.toml, manage.py, etc.)'",
        },
        build: {
            description: 'Build project for production',
            rules: [
                { match: { file: 'bun.lockb' }, command: 'bun run build' },
                { match: { file: 'pnpm-lock.yaml' }, command: 'pnpm build' },
                { match: { file: 'yarn.lock' }, command: 'yarn build' },
                { match: { file: 'package.json' }, command: 'npm run build' },
                { match: { file: 'Cargo.toml' }, command: 'cargo build --release' },
                { match: { file: 'go.mod' }, command: 'go build -v ./...' },
                { match: { file: 'composer.json' }, command: 'composer run build' },
                { match: { file: 'pom.xml' }, command: 'mvn clean package' },
                { match: { file: 'build.gradle' }, command: './gradlew build' },
            ],
            fallback: "echo 'No build configuration detected'",
        },
        test: {
            description: 'Run unit and integration test suites',
            rules: [
                { match: { file: 'bun.lockb' }, command: 'bun test' },
                { match: { file: 'pnpm-lock.yaml' }, command: 'pnpm test' },
                { match: { file: 'yarn.lock' }, command: 'yarn test' },
                { match: { file: 'package.json' }, command: 'npm test' },
                { match: { file: 'Cargo.toml' }, command: 'cargo test' },
                { match: { file: 'go.mod' }, command: 'go test -v ./...' },
                { match: { file: 'composer.json' }, command: 'composer run test' },
                { match: { file: 'pytest.ini' }, command: 'pytest' },
                { match: { file: 'phpunit.xml' }, command: 'phpunit' },
                { match: { file: 'pom.xml' }, command: 'mvn test' },
                { match: { file: 'build.gradle' }, command: './gradlew test' },
            ],
            fallback: "echo 'No testing framework detected'",
        },
        lint: {
            description: 'Run linters and code formatters',
            rules: [
                { match: { file: 'bun.lockb' }, command: 'bun run lint' },
                { match: { file: 'pnpm-lock.yaml' }, command: 'pnpm lint' },
                { match: { file: 'yarn.lock' }, command: 'yarn lint' },
                { match: { file: 'package.json' }, command: 'npm run lint' },
                { match: { file: 'Cargo.toml' }, command: 'cargo clippy' },
                { match: { file: '.golangci.yml' }, command: 'golangci-lint run' },
                { match: { file: 'composer.json' }, command: 'composer run lint' },
                { match: { file: 'pom.xml' }, command: 'mvn checkstyle:check' },
                { match: { file: 'build.gradle' }, command: './gradlew checkstyleMain' },
            ],
            fallback: "echo 'No linting framework detected'",
        },
    },
};
