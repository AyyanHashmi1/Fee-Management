// ==================================================
// AL-AMEEN ISLAMIC INSTITUTE
// FEE MANAGEMENT SYSTEM
// ==================================================

const API = "/api";

let students = [];
let fees = [];
let settings = {};


// ==================================================
// HELPERS
// ==================================================

function $(id) {
    return document.getElementById(id);
}


function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function money(value) {

    const number = Number(value) || 0;

    return "Rs. " + number.toLocaleString("en-PK");
}


function showToast(message) {

    const toast = $("toast");

    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}


async function api(url, options = {}) {

    const response = await fetch(API + url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {

        throw new Error(
            data.error || "Server request failed."
        );
    }

    return data;
}


// ==================================================
// MONTHS
// ==================================================

function getMonthValue(date = new Date()) {

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
}


function getMonthLabel(monthValue) {

    const parts = monthValue.split("-");

    if (parts.length !== 2) {
        return monthValue;
    }

    const date = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        1
    );

    return date.toLocaleString("en-US", {
        month: "long",
        year: "numeric"
    });
}


function buildMonthOptions() {

    const monthPicker = $("monthPicker");
    const challanMonth = $("challanMonth");

    if (!monthPicker || !challanMonth) {
        return;
    }

    const current = new Date();

    monthPicker.innerHTML = "";
    challanMonth.innerHTML = "";

    // Previous 6 months + current + next 6 months
    for (let i = -6; i <= 6; i++) {

        const date = new Date(
            current.getFullYear(),
            current.getMonth() + i,
            1
        );

        const value = getMonthValue(date);
        const label = getMonthLabel(value);

        const option1 = document.createElement("option");

        option1.value = value;
        option1.textContent = label;

        monthPicker.appendChild(option1);


        const option2 = document.createElement("option");

        option2.value = value;
        option2.textContent = label;

        challanMonth.appendChild(option2);
    }

    const currentMonth = getMonthValue();

    monthPicker.value = currentMonth;
    challanMonth.value = currentMonth;
}


// ==================================================
// DATE
// ==================================================

function showToday() {

    const todayChip = $("todayChip");

    if (!todayChip) {
        return;
    }

    const today = new Date();

    todayChip.textContent = today.toLocaleDateString(
        "en-PK",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );
}


// ==================================================
// NAVIGATION
// ==================================================

function setupNavigation() {

    const buttons = document.querySelectorAll(
        ".tabs button"
    );

    buttons.forEach(button => {

        button.addEventListener("click", () => {

            const tab = button.dataset.tab;

            buttons.forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");

            document.querySelectorAll(
                "main > section"
            ).forEach(section => {

                section.style.display = "none";

            });

            const target = $("tab-" + tab);

            if (target) {
                target.style.display = "block";
            }

            if (tab === "challan") {
                populateChallanStudents();
            }

            if (tab === "settings") {
                loadSettingsIntoForm();
            }

        });

    });

}


// ==================================================
// LOAD DATA
// ==================================================

async function loadStudents() {

    try {

        students = await api("/students");

        renderStudentsTable();
        renderDashboard();

        populateChallanStudents();

    } catch (error) {

        console.error(error);

        showToast(
            "Could not load students: " +
            error.message
        );

    }

}


async function loadFees() {

    try {

        fees = await api("/fees");

        renderDashboard();

    } catch (error) {

        console.error(error);

        showToast(
            "Could not load fees: " +
            error.message
        );

    }

}


async function loadSettings() {

    try {

        settings = await api("/settings");

        loadSettingsIntoForm();

        updateSchoolName();

    } catch (error) {

        console.error(error);

        showToast(
            "Could not load settings."
        );

    }

}


// ==================================================
// SETTINGS
// ==================================================

function loadSettingsIntoForm() {

    if (!settings) {
        return;
    }

    if ($("s_name")) {
        $("s_name").value =
            settings.name || "";
    }

    if ($("s_addr")) {
        $("s_addr").value =
            settings.address || "";
    }

    if ($("s_phone")) {
        $("s_phone").value =
            settings.phone || "";
    }

    if ($("s_bank_name")) {
        $("s_bank_name").value =
            settings.bank_name || "";
    }

    if ($("s_account_title")) {
        $("s_account_title").value =
            settings.account_title || "";
    }

    if ($("s_account_number")) {
        $("s_account_number").value =
            settings.account_number || "";
    }

    if ($("s_iban")) {
        $("s_iban").value =
            settings.iban || "";
    }

    if ($("s_branch")) {
        $("s_branch").value =
            settings.branch || "";
    }

}


function updateSchoolName() {

    const headerSchoolName =
        $("headerSchoolName");

    if (!headerSchoolName) {
        return;
    }

    headerSchoolName.textContent =
        settings.name ||
        "Al-Ameen Islamic Institute";
}


async function saveSettings() {

    const data = {

        name: $("s_name").value.trim(),

        address: $("s_addr").value.trim(),

        phone: $("s_phone").value.trim(),

        bank_name:
            $("s_bank_name").value.trim(),

        account_title:
            $("s_account_title").value.trim(),

        account_number:
            $("s_account_number").value.trim(),

        iban:
            $("s_iban").value.trim(),

        branch:
            $("s_branch").value.trim()
    };

    try {

        const result = await api(
            "/settings",
            {
                method: "PUT",
                body: JSON.stringify(data)
            }
        );

        settings = {
            ...settings,
            ...data
        };

        updateSchoolName();

        showToast(
            result.message ||
            "Settings saved successfully."
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Could not save settings: " +
            error.message
        );

    }

}


// ==================================================
// STUDENT FORM
// ==================================================

function setupStudentForm() {

    const form = $("addStudentForm");

    if (!form) {
        return;
    }

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        const data = {

            name: $("f_name").value.trim(),

            regno: $("f_regno").value.trim(),

            roll: $("f_roll").value.trim(),

            department:
                $("f_dept").value.trim(),

            class_section:
                $("f_class").value.trim(),

            qari:
                $("f_qari").value.trim(),

            father:
                $("f_father").value.trim(),

            contact:
                $("f_contact").value.trim(),

            fee:
                Number($("f_fee").value) || 0
        };

        try {

            const result = await api(
                "/students",
                {
                    method: "POST",
                    body: JSON.stringify(data)
                }
            );

            showToast(
                result.message ||
                "Student added successfully."
            );

            form.reset();

            await loadStudents();

        } catch (error) {

            console.error(error);

            showToast(
                "Could not add student: " +
                error.message
            );

        }

    });

}


// ==================================================
// STUDENT TABLE
// ==================================================

function renderStudentsTable() {

    const tbody = $("allStudentsTbody");
    const count = $("allCount");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (count) {
        count.textContent = students.length;
    }

    if (students.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center;">
                    No students added yet.
                </td>
            </tr>
        `;

        return;
    }


    students.forEach(student => {

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>
                <strong>
                    ${escapeHTML(student.name)}
                </strong>
            </td>

            <td>
                ${escapeHTML(student.regno || "-")}
            </td>

            <td>
                ${escapeHTML(student.roll)}
            </td>

            <td>
                ${escapeHTML(student.department || "-")}
            </td>

            <td>
                ${escapeHTML(student.class_section)}
            </td>

            <td>
                ${escapeHTML(student.qari || "-")}
            </td>

            <td>
                ${money(student.fee)}
            </td>

            <td>

                <button
                    class="btn danger delete-student"
                    data-id="${student.id}"
                    style="margin:0;padding:7px 10px;"
                >
                    Delete
                </button>

            </td>
        `;

        tbody.appendChild(row);

    });


    document.querySelectorAll(
        ".delete-student"
    ).forEach(button => {

        button.addEventListener("click", async () => {

            const id = button.dataset.id;

            const confirmed = confirm(
                "Are you sure you want to delete this student?"
            );

            if (!confirmed) {
                return;
            }

            try {

                await api(
                    "/students/" + id,
                    {
                        method: "DELETE"
                    }
                );

                showToast(
                    "Student deleted successfully."
                );

                await loadStudents();
                await loadFees();

            } catch (error) {

                console.error(error);

                showToast(
                    "Could not delete student."
                );

            }

        });

    });

}


// ==================================================
// DASHBOARD
// ==================================================

function getFeesForMonth(month) {

    return fees.filter(
        fee => fee.month === month
    );
}


function isStudentPaid(studentId, month) {

    return fees.some(
        fee =>
            Number(fee.student_id) ===
            Number(studentId) &&
            fee.month === month &&
            Number(fee.paid) === 1
    );

}


function renderDashboard() {

    const month =
        $("monthPicker") ?
        $("monthPicker").value :
        getMonthValue();

    const search =
        $("searchInput") ?
        $("searchInput").value
            .trim()
            .toLowerCase() :
        "";

    const monthlyFees =
        getFeesForMonth(month);


    // ----------------------------------------------
    // Stats
    // ----------------------------------------------

    const paidCount =
        students.filter(
            student =>
                isStudentPaid(student.id, month)
        ).length;


    const unpaidStudents =
        students.filter(
            student =>
                !isStudentPaid(student.id, month)
        );


    const outstanding =
        unpaidStudents.reduce(
            (total, student) =>
                total + Number(student.fee || 0),
            0
        );


    if ($("statStudents")) {
        $("statStudents").textContent =
            students.length;
    }

    if ($("statPaid")) {
        $("statPaid").textContent =
            paidCount;
    }

    if ($("statUnpaid")) {
        $("statUnpaid").textContent =
            unpaidStudents.length;
    }

    if ($("statOutstanding")) {
        $("statOutstanding").textContent =
            money(outstanding);
    }


    // ----------------------------------------------
    // Search table
    // ----------------------------------------------

    let filteredStudents =
        students.filter(student => {

            if (!search) {
                return true;
            }

            return (
                String(student.name)
                    .toLowerCase()
                    .includes(search) ||

                String(student.roll)
                    .toLowerCase()
                    .includes(search) ||

                String(student.class_section)
                    .toLowerCase()
                    .includes(search) ||

                String(student.contact || "")
                    .toLowerCase()
                    .includes(search)
            );

        });


    const tbody =
        $("studentsTbody");

    if (tbody) {

        tbody.innerHTML = "";

        if (filteredStudents.length === 0) {

            $("dashboardEmpty").style.display =
                "block";

        } else {

            $("dashboardEmpty").style.display =
                "none";


            filteredStudents.forEach(student => {

                const paid =
                    isStudentPaid(
                        student.id,
                        month
                    );

                const row =
                    document.createElement("tr");


                row.innerHTML = `

                    <td>
                        <strong>
                            ${escapeHTML(student.name)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(student.roll)}
                    </td>

                    <td>
                        ${escapeHTML(student.class_section)}
                    </td>

                    <td>
                        ${escapeHTML(
                            student.contact || "-"
                        )}
                    </td>

                    <td>

                        <span class="status ${
                            paid
                                ? "paid"
                                : "unpaid"
                        }">

                            ${
                                paid
                                    ? "Paid"
                                    : "Unpaid"
                            }

                        </span>

                    </td>
                `;

                tbody.appendChild(row);

            });

        }

    }


    // ----------------------------------------------
    // Unpaid list
    // ----------------------------------------------

    if ($("unpaidMonthLabel")) {

        $("unpaidMonthLabel").textContent =
            getMonthLabel(month);

    }


    const unpaidList =
        $("unpaidList");

    if (!unpaidList) {
        return;
    }


    unpaidList.innerHTML = "";


    if (unpaidStudents.length === 0) {

        unpaidList.innerHTML = `
            <div class="empty">
                All students have paid for
                ${escapeHTML(getMonthLabel(month))}.
            </div>
        `;

        return;
    }


    unpaidStudents.forEach(student => {

        const item =
            document.createElement("div");

        item.className =
            "unpaid-item";


        item.innerHTML = `

            <div>

                <div class="student-name">
                    ${escapeHTML(student.name)}
                </div>

                <div class="student-info">

                    Roll ${escapeHTML(student.roll)}
                    ·
                    Class ${escapeHTML(student.class_section)}

                </div>

            </div>

            <div style="display:flex;align-items:center;gap:15px;">

                <span class="amount">
                    ${money(student.fee)}
                </span>

                <button
                    class="btn gold mark-paid"
                    data-id="${student.id}"
                    style="margin:0;padding:8px 12px;"
                >
                    Mark Paid
                </button>

            </div>
        `;


        unpaidList.appendChild(item);

    });


    document.querySelectorAll(
        ".mark-paid"
    ).forEach(button => {

        button.addEventListener(
            "click",
            () => markStudentPaid(
                button.dataset.id,
                month
            )
        );

    });

}


// ==================================================
// MARK PAID
// ==================================================

async function markStudentPaid(
    studentId,
    month
) {

    const student =
        students.find(
            s =>
                Number(s.id) ===
                Number(studentId)
        );


    if (!student) {
        return;
    }


    try {

        await api(
            "/fees",
            {
                method: "POST",

                body: JSON.stringify({

                    student_id:
                        Number(studentId),

                    month:

                        month,

                    amount:

                        Number(student.fee) || 0,

                    admission_fee: 0,

                    arrear: 0,

                    security_charges: 0,

                    late_fee: 0,

                    due_date: ""
                })
            }
        );


        showToast(
            student.name +
            " marked as paid."
        );


        await loadFees();

    } catch (error) {

        console.error(error);

        showToast(
            "Could not mark fee as paid: " +
            error.message
        );

    }

}


// ==================================================
// SEARCH
// ==================================================

function setupSearch() {

    const input =
        $("searchInput");

    if (!input) {
        return;
    }

    input.addEventListener(
        "input",
        renderDashboard
    );

}


// ==================================================
// MONTH CHANGE
// ==================================================

function setupMonthPicker() {

    const picker =
        $("monthPicker");

    if (!picker) {
        return;
    }

    picker.addEventListener(
        "change",
        renderDashboard
    );

}


// ==================================================
// CHALLAN STUDENTS
// ==================================================

function populateChallanStudents() {

    const select =
        $("challanStudent");

    if (!select) {
        return;
    }

    select.innerHTML = "";

    if (students.length === 0) {

        const option =
            document.createElement("option");

        option.value = "";

        option.textContent =
            "No students available";

        select.appendChild(option);

        return;
    }


    students.forEach(student => {

        const option =
            document.createElement("option");

        option.value =
            student.id;

        option.textContent =
            `${student.name} - Roll ${student.roll}`;

        select.appendChild(option);

    });


    updateChallanAmount();

}


// ==================================================
// CHALLAN AMOUNT
// ==================================================

function updateChallanAmount() {

    const studentId =
        Number(
            $("challanStudent").value
        );

    const student =
        students.find(
            s =>
                Number(s.id) ===
                studentId
        );

    if (!student) {
        return;
    }

    $("challanAmount").value =
        Number(student.fee) || 0;

}


// ==================================================
// CHALLAN
// ==================================================

function setupChallan() {

    $("challanStudent")
        .addEventListener(
            "change",
            updateChallanAmount
        );


    $("genChallanBtn")
        .addEventListener(
            "click",
            generateChallan
        );

}


async function generateChallan() {

    const studentId =
        Number(
            $("challanStudent").value
        );


    const student =
        students.find(
            s =>
                Number(s.id) ===
                studentId
        );


    if (!student) {

        showToast(
            "Please select a student."
        );

        return;
    }


    const month =
        $("challanMonth").value;


    const amount =
        Number(
            $("challanAmount").value
        ) || 0;


    const admission =
        Number(
            $("challanAdmission").value
        ) || 0;


    const arrear =
        Number(
            $("challanArrear").value
        ) || 0;


    const security =
        Number(
            $("challanSecurity").value
        ) || 0;


    const lateFee =
        Number(
            $("challanLateFee").value
        ) || 0;


    const dueDate =
        $("challanDueDate").value;


    const total =
        amount +
        admission +
        arrear +
        security +
        lateFee;


    // Save fee record as paid
    try {

        await api(
            "/fees",
            {
                method: "POST",

                body: JSON.stringify({

                    student_id:
                        student.id,

                    month:
                        month,

                    amount:
                        amount,

                    admission_fee:
                        admission,

                    arrear:
                        arrear,

                    security_charges:
                        security,

                    late_fee:
                        lateFee,

                    due_date:
                        dueDate
                })
            }
        );

        await loadFees();

    } catch (error) {

        console.error(error);

        showToast(
            "Could not save fee record: " +
            error.message
        );

        return;
    }


    createPrintPage(
        student,
        month,
        amount,
        admission,
        arrear,
        security,
        lateFee,
        dueDate,
        total
    );


    setTimeout(() => {

        window.print();

    }, 300);

}


// ==================================================
// PRINT CHALLAN
// ==================================================

function createPrintPage(
    student,
    month,
    amount,
    admission,
    arrear,
    security,
    lateFee,
    dueDate,
    total
) {

    const printArea =
        $("printArea");


    const schoolName =
        settings.name ||
        "Al-Ameen Islamic Institute";


    const logo =
        "/logo.png";


    const phone =
        settings.phone || "-";


    const address =
        settings.address || "-";


    const bankName =
        settings.bank_name || "-";


    const accountTitle =
        settings.account_title || "-";


    const accountNumber =
        settings.account_number || "-";


    const iban =
        settings.iban || "-";


    const branch =
        settings.branch || "-";


    const dueDateText =
        dueDate
            ? new Date(
                dueDate + "T00:00:00"
            ).toLocaleDateString(
                "en-PK"
            )
            : "-";


    function copyHTML(copyName) {

        return `

            <div class="challan-copy">

                <div class="challan-header">

                    <img
                        class="challan-logo"
                        src="${logo}"
                        alt="Logo"
                    >

                    <div>

                        <div class="challan-title">
                            ${escapeHTML(schoolName)}
                        </div>

                        <div class="challan-subtitle">
                            Fee Challan
                        </div>

                    </div>

                    <div class="copy-label">
                        ${copyName}
                    </div>

                </div>


                <div class="challan-info">

                    <div>
                        <strong>Student:</strong>
                        ${escapeHTML(student.name)}
                    </div>

                    <div>
                        <strong>Month:</strong>
                        ${escapeHTML(
                            getMonthLabel(month)
                        )}
                    </div>

                    <div>
                        <strong>Roll No:</strong>
                        ${escapeHTML(student.roll)}
                    </div>

                    <div>
                        <strong>Class:</strong>
                        ${escapeHTML(
                            student.class_section
                        )}
                    </div>

                    <div>
                        <strong>Father/Guardian:</strong>
                        ${escapeHTML(
                            student.father || "-"
                        )}
                    </div>

                    <div>
                        <strong>Due Date:</strong>
                        ${escapeHTML(
                            dueDateText
                        )}
                    </div>

                </div>


                <table class="challan-table">

                    <thead>

                        <tr>
                            <th>Description</th>
                            <th>Amount</th>
                        </tr>

                    </thead>

                    <tbody>

                        <tr>
                            <td>Monthly Fee</td>
                            <td>${money(amount)}</td>
                        </tr>

                        <tr>
                            <td>Admission Fee</td>
                            <td>${money(admission)}</td>
                        </tr>

                        <tr>
                            <td>Arrear</td>
                            <td>${money(arrear)}</td>
                        </tr>

                        <tr>
                            <td>Security Charges</td>
                            <td>${money(security)}</td>
                        </tr>

                        <tr>
                            <td>Late Fee</td>
                            <td>${money(lateFee)}</td>
                        </tr>

                        <tr class="challan-total">

                            <td>
                                TOTAL PAYABLE
                            </td>

                            <td>
                                ${money(total)}
                            </td>

                        </tr>

                    </tbody>

                </table>


                <div class="bank-box">

                    <h4>
                        Bank Payment Details
                    </h4>

                    <div>
                        <strong>Bank:</strong>
                        ${escapeHTML(bankName)}
                    </div>

                    <div>
                        <strong>Account Title:</strong>
                        ${escapeHTML(accountTitle)}
                    </div>

                    <div>
                        <strong>Account Number:</strong>
                        ${escapeHTML(accountNumber)}
                    </div>

                    <div>
                        <strong>IBAN:</strong>
                        ${escapeHTML(iban)}
                    </div>

                    <div>
                        <strong>Branch / Code:</strong>
                        ${escapeHTML(branch)}
                    </div>

                </div>


                <div class="challan-footer">

                    <div>
                        <strong>Phone:</strong>
                        ${escapeHTML(phone)}
                    </div>

                    <div>
                        ${escapeHTML(address)}
                    </div>

                    <div>
                        Authorized Signature
                    </div>

                </div>

            </div>

        `;
    }


    printArea.innerHTML = `

        <div class="print-page">

            ${copyHTML("SCHOOL COPY")}

            ${copyHTML("STUDENT COPY")}

        </div>

    `;

}


// ==================================================
// EVENT SETUP
// ==================================================

function setupSettings() {

    const button =
        $("saveSettingsBtn");

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        saveSettings
    );

}


// ==================================================
// INITIALIZATION
// ==================================================

async function initialize() {

    console.log(
        "Starting Al-Ameen Fee Management System..."
    );


    buildMonthOptions();

    showToday();

    setupNavigation();

    setupStudentForm();

    setupSearch();

    setupMonthPicker();

    setupSettings();

    setupChallan();


    try {

        await loadSettings();

        await loadStudents();

        await loadFees();

    } catch (error) {

        console.error(
            "Initialization error:",
            error
        );

    }


    console.log(
        "Application started successfully."
    );

}


// Start application
document.addEventListener(
    "DOMContentLoaded",
    initialize
);