const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");

const userModel = require("../schemas/users");
const roleModel = require("../schemas/roles");
const { sendWelcomePasswordMail } = require("../utils/senMailHandler");

function generatePassword(length = 16) {
    return crypto.randomBytes(32).toString("base64url").slice(0, length);
}

function parseUsersFile(fileContent) {
    const lines = fileContent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length === 0) {
        return [];
    }

    const normalizedHeader = lines[0].replace(/^\uFEFF/, "");
    const header = normalizedHeader.toLowerCase();
    const delimiter = header.includes("\t") ? "\t" : ",";
    const headerColumns = normalizedHeader.split(delimiter).map((v) => v.trim().toLowerCase());
    const usernameIndex = headerColumns.indexOf("username");
    const emailIndex = headerColumns.indexOf("email");

    if (usernameIndex === -1 || emailIndex === -1) {
        throw new Error("File must include header columns: username,email");
    }

    return lines.slice(1).map((line, index) => {
        const parts = line.split(delimiter).map((v) => v.trim());
        const username = parts[usernameIndex];
        const email = parts[emailIndex];

        if (!username || !email) {
            throw new Error(`Invalid row at line ${index + 2}: ${line}`);
        }

        return { username, email };
    });
}

async function ensureUserRole() {
    let role = await roleModel.findOne({ name: { $regex: /^user$/i }, isDeleted: false });
    if (!role) {
        role = new roleModel({
            name: "user",
            description: "Default user role"
        });
        await role.save();
    }
    return role;
}

async function importUsers(filePath) {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
        throw new Error(`Input file not found: ${fullPath}`);
    }

    const content = fs.readFileSync(fullPath, "utf8");
    const users = parseUsersFile(content);

    if (users.length === 0) {
        console.log("No users found in file.");
        return;
    }

    const role = await ensureUserRole();

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const item of users) {
        try {
            const existed = await userModel.findOne({
                $or: [{ username: item.username }, { email: item.email }],
                isDeleted: false
            });

            if (existed) {
                skipped += 1;
                console.log(`[SKIP] ${item.username} (${item.email}) already exists.`);
                continue;
            }

            const plainPassword = generatePassword(16);
            const newUser = new userModel({
                username: item.username,
                email: item.email,
                password: plainPassword,
                role: role._id,
                status: false
            });

            await newUser.save();
            await sendWelcomePasswordMail(item.email, item.username, plainPassword);

            created += 1;
            console.log(`[OK] Created ${item.username} and sent email to ${item.email}`);
        } catch (error) {
            failed += 1;
            console.error(`[FAIL] ${item.username} (${item.email}): ${error.message}`);
        }
    }

    console.log("\n=== Import Summary ===");
    console.log(`Total: ${users.length}`);
    console.log(`Created: ${created}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Failed: ${failed}`);
}

async function main() {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/NNPTUD-C6";
    const inputFilePath = process.argv[2] || path.join(__dirname, "users-import.csv");

    try {
        await mongoose.connect(mongoUri);
        console.log("Connected MongoDB.");

        await importUsers(inputFilePath);
    } catch (error) {
        console.error("Import failed:", error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected MongoDB.");
    }
}

main();
