const express = require("express");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;

const publicFolder = path.join(__dirname, "public");
const dbFile = path.join(__dirname, "fees.db");

// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Serve everything inside public/
// Example:
// public/logo.png -> http://localhost:3000/logo.png
app.use(express.static(publicFolder));

// --------------------------------------------------
// DATABASE
// --------------------------------------------------

const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error("Database error:", err.message);
    } else {
        console.log("SQLite database connected.");
    }
});

// --------------------------------------------------
// CREATE TABLES
// --------------------------------------------------

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            regno TEXT DEFAULT '',
            roll TEXT NOT NULL,
            department TEXT DEFAULT '',
            class_section TEXT NOT NULL,
            qari TEXT DEFAULT '',
            father TEXT DEFAULT '',
            contact TEXT DEFAULT '',
            fee REAL DEFAULT 0
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS fees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            month TEXT NOT NULL,
            amount REAL DEFAULT 0,
            admission_fee REAL DEFAULT 0,
            arrear REAL DEFAULT 0,
            security_charges REAL DEFAULT 0,
            late_fee REAL DEFAULT 0,
            due_date TEXT DEFAULT '',
            paid INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(student_id) REFERENCES students(id)
        )
    `);

    db.get(
        `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'students'`,
        [],
        (studentErr, studentRow) => {

            if (studentErr) {
                console.error("Could not inspect students table:", studentErr.message);
                return;
            }

            const studentTableSql = studentRow && studentRow.sql ? studentRow.sql.toLowerCase() : "";
            const isLegacyStudentSchema =
                studentTableSql.includes("roll_no") ||
                studentTableSql.includes("monthly_fee") ||
                studentTableSql.includes("father_name") ||
                studentTableSql.includes("registration_no");

            if (isLegacyStudentSchema) {

                db.run(`
                    CREATE TABLE students_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        regno TEXT DEFAULT '',
                        roll TEXT NOT NULL,
                        department TEXT DEFAULT '',
                        class_section TEXT NOT NULL,
                        qari TEXT DEFAULT '',
                        father TEXT DEFAULT '',
                        contact TEXT DEFAULT '',
                        fee REAL DEFAULT 0
                    )
                `, (newTableErr) => {

                    if (newTableErr) {
                        console.error("Could not create migrated students table:", newTableErr.message);
                        return;
                    }

                    db.run(`
                        INSERT INTO students_new
                        (id, name, regno, roll, department, class_section, qari, father, contact, fee)
                        SELECT
                            id,
                            name,
                            COALESCE(registration_no, ''),
                            COALESCE(roll_no, ''),
                            COALESCE(department, ''),
                            COALESCE(class, ''),
                            COALESCE(qari, ''),
                            COALESCE(father_name, ''),
                            COALESCE(contact, ''),
                            COALESCE(monthly_fee, 0)
                        FROM students
                    `, (copyErr) => {

                        if (copyErr) {
                            console.error("Could not copy legacy student data:", copyErr.message);
                            return;
                        }

                        db.run(`DROP TABLE students`, (dropErr) => {
                            if (dropErr) {
                                console.error("Could not remove legacy students table:", dropErr.message);
                                return;
                            }

                            db.run(`ALTER TABLE students_new RENAME TO students`, (renameErr) => {
                                if (renameErr) {
                                    console.error("Could not rename migrated students table:", renameErr.message);
                                }
                            });
                        });
                    });
                });

                return;
            }

            db.get(
                `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'settings'`,
                [],
                (err, row) => {

                    if (err) {
                        console.error("Could not inspect settings table:", err.message);
                        return;
                    }

                    const tableSql = row && row.sql ? row.sql.toLowerCase() : "";
                    const isLegacySettingsTable =
                        tableSql.includes("key") &&
                        tableSql.includes("value") &&
                        !tableSql.includes("account_title");

                    if (isLegacySettingsTable) {

                        db.run(`ALTER TABLE settings RENAME TO settings_legacy`, (renameErr) => {

                            if (renameErr) {
                                console.error("Could not migrate legacy settings:", renameErr.message);
                                return;
                            }

                            db.run(`
                                CREATE TABLE IF NOT EXISTS settings (
                                    id INTEGER PRIMARY KEY,
                                    name TEXT DEFAULT 'Al-Ameen Islamic Institute',
                                    address TEXT DEFAULT '',
                                    phone TEXT DEFAULT '',
                                    bank_name TEXT DEFAULT '',
                                    account_title TEXT DEFAULT '',
                                    account_number TEXT DEFAULT '',
                                    iban TEXT DEFAULT '',
                                    branch TEXT DEFAULT ''
                                )
                            `, (createErr) => {

                                if (createErr) {
                                    console.error("Could not create settings table:", createErr.message);
                                    return;
                                }

                                db.all(`SELECT key, value FROM settings_legacy`, [], (legacyErr, legacyRows) => {

                                    if (legacyErr) {
                                        console.error("Could not read legacy settings:", legacyErr.message);
                                        return;
                                    }

                                    const map = {};

                                    legacyRows.forEach(item => {
                                        if (item && item.key) {
                                            map[item.key] = item.value || "";
                                        }
                                    });

                                    db.run(`
                                        INSERT OR IGNORE INTO settings
                                        (id, name, address, phone, bank_name, account_title, account_number, iban, branch)
                                        VALUES
                                        (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                    `, [
                                        1,
                                        map.name || "Al-Ameen Islamic Institute",
                                        map.address || "",
                                        map.phone || "",
                                        map.bank_name || "",
                                        map.account_title || "",
                                        map.account_number || "",
                                        map.iban || "",
                                        map.branch || ""
                                    ], (insertErr) => {
                                        if (insertErr) {
                                            console.error("Could not import legacy settings:", insertErr.message);
                                        }
                                    });
                                });
                            });
                        });

                        return;
                    }

                    db.run(`
                        CREATE TABLE IF NOT EXISTS settings (
                            id INTEGER PRIMARY KEY,
                            name TEXT DEFAULT 'Al-Ameen Islamic Institute',
                            address TEXT DEFAULT '',
                            phone TEXT DEFAULT '',
                            bank_name TEXT DEFAULT '',
                            account_title TEXT DEFAULT '',
                            account_number TEXT DEFAULT '',
                            iban TEXT DEFAULT '',
                            branch TEXT DEFAULT ''
                        )
                    `);

                    db.run(`
                        INSERT OR IGNORE INTO settings
                        (id, name, address, phone, bank_name, account_title, account_number, iban, branch)
                        VALUES
                        (1, 'Al-Ameen Islamic Institute', '', '', '', '', '', '', '')
                    `);
                }
            );
        }
    );

});

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Server is running"
    });
});

// --------------------------------------------------
// STUDENTS
// --------------------------------------------------

// GET ALL STUDENTS
app.get("/api/students", (req, res) => {

    db.all(
        `SELECT * FROM students ORDER BY name ASC`,
        [],
        (err, rows) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    error: "Could not load students."
                });
            }

            res.json(rows);
        }
    );

});

// ADD STUDENT
app.post("/api/students", (req, res) => {

    const {
        name,
        regno,
        roll,
        department,
        class_section,
        qari,
        father,
        contact,
        fee
    } = req.body;

    if (!name || !roll || !class_section) {
        return res.status(400).json({
            success: false,
            error: "Name, roll number and class are required."
        });
    }

    db.run(
        `
        INSERT INTO students
        (
            name,
            regno,
            roll,
            department,
            class_section,
            qari,
            father,
            contact,
            fee
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            name.trim(),
            regno || "",
            roll.trim(),
            department || "",
            class_section.trim(),
            qari || "",
            father || "",
            contact || "",
            Number(fee) || 0
        ],
        function (err) {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    error: "Could not add student."
                });
            }

            res.json({
                success: true,
                id: this.lastID,
                message: "Student added successfully."
            });
        }
    );

});

// DELETE STUDENT
app.delete("/api/students/:id", (req, res) => {

    const studentId = Number(req.params.id);

    db.run(
        `DELETE FROM fees WHERE student_id = ?`,
        [studentId],
        (feeErr) => {

            if (feeErr) {
                console.error(feeErr);
            }

            db.run(
                `DELETE FROM students WHERE id = ?`,
                [studentId],
                function (err) {

                    if (err) {
                        console.error(err);

                        return res.status(500).json({
                            success: false,
                            error: "Could not delete student."
                        });
                    }

                    res.json({
                        success: true,
                        message: "Student deleted successfully."
                    });
                }
            );

        }
    );

});

// --------------------------------------------------
// FEES
// --------------------------------------------------

// GET FEES
app.get("/api/fees", (req, res) => {

    db.all(
        `
        SELECT
            fees.*,
            students.name,
            students.roll,
            students.class_section,
            students.contact,
            students.fee AS monthly_fee
        FROM fees
        INNER JOIN students
            ON students.id = fees.student_id
        ORDER BY fees.id DESC
        `,
        [],
        (err, rows) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    error: "Could not load fee records."
                });
            }

            res.json(rows);
        }
    );

});

// GET FEES FOR MONTH
app.get("/api/fees/month/:month", (req, res) => {

    const month = req.params.month;

    db.all(
        `
        SELECT
            fees.*,
            students.name,
            students.roll,
            students.class_section,
            students.contact,
            students.fee AS monthly_fee
        FROM fees
        INNER JOIN students
            ON students.id = fees.student_id
        WHERE fees.month = ?
        ORDER BY students.name ASC
        `,
        [month],
        (err, rows) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    error: "Could not load monthly fees."
                });
            }

            res.json(rows);
        }
    );

});

// ADD / MARK FEE AS PAID
app.post("/api/fees", (req, res) => {

    const {
        student_id,
        month,
        amount,
        admission_fee,
        arrear,
        security_charges,
        late_fee,
        due_date
    } = req.body;

    if (!student_id || !month) {
        return res.status(400).json({
            success: false,
            error: "Student and month are required."
        });
    }

    // Check if fee already exists for this student/month
    db.get(
        `
        SELECT id
        FROM fees
        WHERE student_id = ?
        AND month = ?
        `,
        [student_id, month],
        (checkErr, existing) => {

            if (checkErr) {
                console.error(checkErr);

                return res.status(500).json({
                    success: false,
                    error: "Could not check fee record."
                });
            }

            // If already exists, update it
            if (existing) {

                db.run(
                    `
                    UPDATE fees
                    SET
                        amount = ?,
                        admission_fee = ?,
                        arrear = ?,
                        security_charges = ?,
                        late_fee = ?,
                        due_date = ?,
                        paid = 1
                    WHERE id = ?
                    `,
                    [
                        Number(amount) || 0,
                        Number(admission_fee) || 0,
                        Number(arrear) || 0,
                        Number(security_charges) || 0,
                        Number(late_fee) || 0,
                        due_date || "",
                        existing.id
                    ],
                    function (err) {

                        if (err) {
                            console.error(err);

                            return res.status(500).json({
                                success: false,
                                error: "Could not update fee record."
                            });
                        }

                        res.json({
                            success: true,
                            message: "Fee marked as paid."
                        });
                    }
                );

                return;
            }

            // Otherwise create new record
            db.run(
                `
                INSERT INTO fees
                (
                    student_id,
                    month,
                    amount,
                    admission_fee,
                    arrear,
                    security_charges,
                    late_fee,
                    due_date,
                    paid
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
                `,
                [
                    student_id,
                    month,
                    Number(amount) || 0,
                    Number(admission_fee) || 0,
                    Number(arrear) || 0,
                    Number(security_charges) || 0,
                    Number(late_fee) || 0,
                    due_date || ""
                ],
                function (err) {

                    if (err) {
                        console.error(err);

                        return res.status(500).json({
                            success: false,
                            error: "Could not save fee record."
                        });
                    }

                    res.json({
                        success: true,
                        id: this.lastID,
                        message: "Fee marked as paid."
                    });
                }
            );

        }
    );

});

// --------------------------------------------------
// SETTINGS
// --------------------------------------------------

// GET SETTINGS
app.get("/api/settings", (req, res) => {

    db.get(
        `SELECT * FROM settings WHERE id = 1`,
        [],
        (err, row) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    error: "Could not load settings."
                });
            }

            res.json(row || {});
        }
    );

});

// SAVE SETTINGS
//
// IMPORTANT:
// The logo is NOT uploaded to the server.
// logo.png stays inside public/.
// --------------------------------------------------

app.put("/api/settings", (req, res) => {

    const {
        name,
        address,
        phone,
        bank_name,
        account_title,
        account_number,
        iban,
        branch
    } = req.body;

    db.run(
        `
        UPDATE settings
        SET
            name = ?,
            address = ?,
            phone = ?,
            bank_name = ?,
            account_title = ?,
            account_number = ?,
            iban = ?,
            branch = ?
        WHERE id = 1
        `,
        [
            name || "",
            address || "",
            phone || "",
            bank_name || "",
            account_title || "",
            account_number || "",
            iban || "",
            branch || ""
        ],
        function (err) {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    error: "Could not save settings."
                });
            }

            res.json({
                success: true,
                message: "Settings saved successfully."
            });
        }
    );

});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, () => {

    console.log("");
    console.log("======================================");
    console.log(" Al-Ameen Fee Management System");
    console.log("======================================");
    console.log(` Server: http://localhost:${PORT}`);
    console.log(` Logo:   http://localhost:${PORT}/logo.png`);
    console.log("======================================");
    console.log("");

});
