module.exports = {
    apps: [
        {
            name: "sports-sync-rust",
            script: "./target/release/sports-sync-rust",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "500M",
            env: {
                NODE_ENV: "production"
            }
        }
    ]
};
