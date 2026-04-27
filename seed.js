const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { connectDb, disconnectDb } = require("./src/config/db");
const { getEnv } = require("./src/config/env");

const User = require("./src/models/User");
const Asset = require("./src/models/Asset");
const MachineDetail = require("./src/models/MachineDetail");
const MoldDetail = require("./src/models/MoldDetail");
const JigDetail = require("./src/models/JigDetail");
const InfraDetail = require("./src/models/InfraDetail");
const PmSchedule = require("./src/models/PmSchedule");
const WorkOrder = require("./src/models/WorkOrder");
const MaintenanceLog = require("./src/models/MaintenanceLog");
const SparePartUsed = require("./src/models/SparePartUsed");

const USERS_DATA = [
  { name: "Admin Hệ Thống", email: "admin@factory.local", role: "admin" },
  { name: "Quản Lý Nhà Máy", email: "manager@factory.local", role: "site_manager" },
  { name: "Kỹ Thuật Viên A", email: "tech1@factory.local", role: "technician" },
  { name: "Kỹ Thuật Viên B", email: "tech2@factory.local", role: "technician" },
  { name: "Kế Toán Mua Sắm", email: "accountant@factory.local", role: "accountant" },
];

const BASE_ASSETS = [
  { assetCode: "MC-001", name: "CNC Phay", assetType: "machine", status: "active", location: "Xưởng Cắt Gọt", manufacturer: "Mazak", model: "VCN-530", serialNumber: "MC-001", purchasePrice: 2800000000 },
  { assetCode: "MC-002", name: "CNC Tiện", assetType: "machine", status: "active", location: "Xưởng Cắt Gọt", manufacturer: "Okuma", model: "LB3000", serialNumber: "MC-002", purchasePrice: 2500000000 },
  { assetCode: "MC-003", name: "Máy Dập/Ép", assetType: "machine", status: "in_repair", location: "Xưởng Dập", manufacturer: "AIDA", model: "AIDA-250T", serialNumber: "MC-003", purchasePrice: 3200000000 },
  { assetCode: "MC-004", name: "Máy Mài", assetType: "machine", status: "active", location: "Xưởng Hoàn Thiện", manufacturer: "Okamoto", model: "PSG-64", serialNumber: "MC-004", purchasePrice: 1300000000 },
  { assetCode: "MC-005", name: "Máy Hàn Robot", assetType: "machine", status: "active", location: "Line Hàn", manufacturer: "Fanuc", model: "ARC Mate", serialNumber: "MC-005", purchasePrice: 3600000000 },
  { assetCode: "MC-006", name: "Máy Cắt Laser", assetType: "machine", status: "idle", location: "Xưởng Cắt", manufacturer: "Trumpf", model: "TruLaser", serialNumber: "MC-006", purchasePrice: 4100000000 },

  { assetCode: "MD-001", name: "Mold Đúc Nhựa", assetType: "mold", status: "active", location: "Kho Khuôn A", manufacturer: "Nội Bộ", model: "MOLD-PLASTIC-01", serialNumber: "MD-001", purchasePrice: 580000000 },
  { assetCode: "MD-002", name: "Die Dập Kim Loại", assetType: "mold", status: "active", location: "Kho Khuôn A", manufacturer: "Nội Bộ", model: "DIE-METAL-01", serialNumber: "MD-002", purchasePrice: 720000000 },
  { assetCode: "MD-003", name: "Khuôn Đúc Áp Lực", assetType: "mold", status: "in_repair", location: "Kho Khuôn B", manufacturer: "Nội Bộ", model: "MOLD-HPDC-01", serialNumber: "MD-003", purchasePrice: 910000000 },
  { assetCode: "MD-004", name: "Khuôn Dập Nguội", assetType: "mold", status: "active", location: "Kho Khuôn B", manufacturer: "Nội Bộ", model: "MOLD-COLD-01", serialNumber: "MD-004", purchasePrice: 680000000 },
  { assetCode: "MD-005", name: "Progressive Die", assetType: "mold", status: "idle", location: "Kho Khuôn C", manufacturer: "Nội Bộ", model: "DIE-PROG-01", serialNumber: "MD-005", purchasePrice: 860000000 },

  { assetCode: "JT-001", name: "Dao Cắt (Insert)", assetType: "jig_tool", status: "active", location: "Kho Tool", manufacturer: "Sandvik", model: "INSERT-A12", serialNumber: "JT-001", purchasePrice: 1500000 },
  { assetCode: "JT-002", name: "Đồ Gá Gia Công", assetType: "jig_tool", status: "active", location: "Line CNC", manufacturer: "Nội Bộ", model: "FIXTURE-CNC-01", serialNumber: "JT-002", purchasePrice: 45000000 },
  { assetCode: "JT-003", name: "Gauge / Dưỡng Đo", assetType: "jig_tool", status: "active", location: "Phòng QC", manufacturer: "Mitutoyo", model: "GAUGE-01", serialNumber: "JT-003", purchasePrice: 12000000 },
  { assetCode: "JT-004", name: "Drill Bit", assetType: "jig_tool", status: "in_repair", location: "Kho Tool", manufacturer: "Guhring", model: "DRILL-10MM", serialNumber: "JT-004", purchasePrice: 900000 },
  { assetCode: "JT-005", name: "Tap", assetType: "jig_tool", status: "active", location: "Kho Tool", manufacturer: "OSG", model: "TAP-M8", serialNumber: "JT-005", purchasePrice: 700000 },

  { assetCode: "IF-001", name: "Máy Nén Khí", assetType: "infrastructure", status: "active", location: "Phòng Utility", manufacturer: "Atlas Copco", model: "GA75", serialNumber: "IF-001", purchasePrice: 950000000 },
  { assetCode: "IF-002", name: "Hệ Thống Làm Mát", assetType: "infrastructure", status: "active", location: "Phòng Utility", manufacturer: "Trane", model: "CHILLER-01", serialNumber: "IF-002", purchasePrice: 1200000000 },
  { assetCode: "IF-003", name: "Điện / Biến Áp", assetType: "infrastructure", status: "active", location: "Trạm Điện", manufacturer: "ABB", model: "TX-560KVA", serialNumber: "IF-003", purchasePrice: 1500000000 },
  { assetCode: "IF-004", name: "Xe Nâng", assetType: "infrastructure", status: "in_repair", location: "Kho Thành Phẩm", manufacturer: "Toyota", model: "8FD30", serialNumber: "IF-004", purchasePrice: 650000000 },
  { assetCode: "IF-005", name: "Băng Tải", assetType: "infrastructure", status: "active", location: "Line Đóng Gói", manufacturer: "Nội Bộ", model: "CONV-01", serialNumber: "IF-005", purchasePrice: 280000000 },
];

const BASE_MACHINE_DETAILS = [
  { assetCode: "MC-001", spindleHours: 520, cycleCount: 4800, oee_availability: 92, oee_performance: 88, oee_quality: 97, alarmCode: "", pmIntervalHours: 500, pmIntervalDays: 90 },
  { assetCode: "MC-002", spindleHours: 460, cycleCount: 4200, oee_availability: 90, oee_performance: 87, oee_quality: 96, alarmCode: "", pmIntervalHours: 500, pmIntervalDays: 90 },
  { assetCode: "MC-003", spindleHours: 630, cycleCount: 6200, oee_availability: 84, oee_performance: 82, oee_quality: 94, alarmCode: "PRESS_OIL_LOW", pmIntervalHours: 500, pmIntervalDays: 90 },
  { assetCode: "MC-004", spindleHours: 390, cycleCount: 3100, oee_availability: 91, oee_performance: 89, oee_quality: 98, alarmCode: "", pmIntervalHours: 500, pmIntervalDays: 90 },
  { assetCode: "MC-005", spindleHours: 700, cycleCount: 7800, oee_availability: 89, oee_performance: 85, oee_quality: 97, alarmCode: "ROBOT_AXIS3", pmIntervalHours: 500, pmIntervalDays: 90 },
  { assetCode: "MC-006", spindleHours: 340, cycleCount: 2900, oee_availability: 83, oee_performance: 80, oee_quality: 95, alarmCode: "LASER_CHILLER", pmIntervalHours: 500, pmIntervalDays: 90 },
];

const BASE_MOLD_DETAILS = [
  { assetCode: "MD-001", totalShots: 120000, shotLimit: 150000, currentMachineCode: "MC-003", storageLocation: "Kho Khuôn A - Kệ 2", lastMaintenanceShot: 100000 },
  { assetCode: "MD-002", totalShots: 230000, shotLimit: 500000, currentMachineCode: "MC-001", storageLocation: "Kho Khuôn A - Kệ 1", lastMaintenanceShot: 200000 },
  { assetCode: "MD-003", totalShots: 90000, shotLimit: 250000, currentMachineCode: "MC-005", storageLocation: "Kho Khuôn B - Kệ 1", lastMaintenanceShot: 80000 },
  { assetCode: "MD-004", totalShots: 180000, shotLimit: 350000, currentMachineCode: "MC-002", storageLocation: "Kho Khuôn B - Kệ 2", lastMaintenanceShot: 160000 },
  { assetCode: "MD-005", totalShots: 300000, shotLimit: 600000, currentMachineCode: "MC-006", storageLocation: "Kho Khuôn C - Kệ 1", lastMaintenanceShot: 280000 },
];

const BASE_JIG_DETAILS = [
  { assetCode: "JT-001", usageCount: 340, sharpenCount: 6, sharpenLimit: 20, calibrationDate: null, nextCalibrationDate: null, checkedOutByEmail: "tech1@factory.local", checkedOutMachineCode: "MC-003" },
  { assetCode: "JT-002", usageCount: 520, sharpenCount: 2, sharpenLimit: 10, calibrationDate: null, nextCalibrationDate: null, checkedOutByEmail: "tech2@factory.local", checkedOutMachineCode: "MC-001" },
  { assetCode: "JT-003", usageCount: 95, sharpenCount: 0, sharpenLimit: 0, calibrationDate: new Date("2026-03-01"), nextCalibrationDate: new Date("2026-06-01"), checkedOutByEmail: "tech1@factory.local", checkedOutMachineCode: "MC-004" },
  { assetCode: "JT-004", usageCount: 760, sharpenCount: 8, sharpenLimit: 25, calibrationDate: null, nextCalibrationDate: null, checkedOutByEmail: "tech2@factory.local", checkedOutMachineCode: "MC-002" },
  { assetCode: "JT-005", usageCount: 410, sharpenCount: 4, sharpenLimit: 15, calibrationDate: null, nextCalibrationDate: null, checkedOutByEmail: "tech1@factory.local", checkedOutMachineCode: "MC-004" },
];

const BASE_INFRA_DETAILS = [
  { assetCode: "IF-001", operatingHours: 2400, pmIntervalDays: 180, lastInspectionDate: new Date("2025-12-01"), nextInspectionDate: new Date("2026-06-01") },
  { assetCode: "IF-002", operatingHours: 1800, pmIntervalDays: 180, lastInspectionDate: new Date("2025-11-10"), nextInspectionDate: new Date("2026-05-10") },
  { assetCode: "IF-003", operatingHours: 3200, pmIntervalDays: 365, lastInspectionDate: new Date("2025-10-01"), nextInspectionDate: new Date("2026-10-01") },
  { assetCode: "IF-004", operatingHours: 1100, pmIntervalDays: 180, lastInspectionDate: new Date("2025-12-01"), nextInspectionDate: new Date("2026-06-01") },
  { assetCode: "IF-005", operatingHours: 2700, pmIntervalDays: 180, lastInspectionDate: new Date("2025-12-10"), nextInspectionDate: new Date("2026-06-10") },
];

const STATUS_SEQUENCE = ["active", "active", "active", "in_repair", "idle", "disposed"];

function pad(num, size = 3) {
  return String(num).padStart(size, "0");
}

function makePurchaseDate(index) {
  return new Date(Date.UTC(2019 + (index % 6), index % 12, ((index - 1) % 28) + 1));
}

function makeHistoryDate(index) {
  return new Date(Date.UTC(2021 + (index % 5), index % 12, ((index - 1) % 28) + 1, 1, 0, 0));
}

function makeWoCode(index) {
  return `WO-20260409-${String(index).padStart(6, "0")}`;
}

function getStatus(index) {
  return STATUS_SEQUENCE[(index - 1) % STATUS_SEQUENCE.length];
}

function buildExtraAssets() {
  const assets = [];
  const machineDetails = [];
  const moldDetails = [];
  const jigDetails = [];
  const infraDetails = [];

  const machineTemplates = [
    { name: "CNC Phay", manufacturer: "Mazak", model: "VCN-530", location: "Xưởng Cắt Gọt" },
    { name: "CNC Tiện", manufacturer: "Okuma", model: "LB3000", location: "Xưởng Cắt Gọt" },
    { name: "Máy Dập/Ép", manufacturer: "AIDA", model: "AIDA-250T", location: "Xưởng Dập" },
    { name: "Máy Mài", manufacturer: "Okamoto", model: "PSG-64", location: "Xưởng Hoàn Thiện" },
    { name: "Máy Hàn Robot", manufacturer: "Fanuc", model: "ARC Mate", location: "Line Hàn" },
    { name: "Máy Cắt Laser", manufacturer: "Trumpf", model: "TruLaser", location: "Xưởng Cắt" },
  ];

  const moldTemplates = [
    { name: "Mold Đúc Nhựa", model: "MOLD-PLASTIC", location: "Kho Khuôn A" },
    { name: "Die Dập Kim Loại", model: "DIE-METAL", location: "Kho Khuôn A" },
    { name: "Khuôn Đúc Áp Lực", model: "MOLD-HPDC", location: "Kho Khuôn B" },
    { name: "Khuôn Dập Nguội", model: "MOLD-COLD", location: "Kho Khuôn B" },
    { name: "Progressive Die", model: "DIE-PROG", location: "Kho Khuôn C" },
  ];

  const jigTemplates = [
    { name: "Dao Cắt (Insert)", manufacturer: "Sandvik", model: "INSERT", location: "Kho Tool" },
    { name: "Đồ Gá Gia Công", manufacturer: "Nội Bộ", model: "FIXTURE", location: "Line CNC" },
    { name: "Gauge / Dưỡng Đo", manufacturer: "Mitutoyo", model: "GAUGE", location: "Phòng QC" },
    { name: "Drill Bit", manufacturer: "Guhring", model: "DRILL", location: "Kho Tool" },
    { name: "Tap", manufacturer: "OSG", model: "TAP", location: "Kho Tool" },
  ];

  const infraTemplates = [
    { name: "Máy Nén Khí", manufacturer: "Atlas Copco", model: "GA", location: "Phòng Utility" },
    { name: "Hệ Thống Làm Mát", manufacturer: "Trane", model: "CHILLER", location: "Phòng Utility" },
    { name: "Điện / Biến Áp", manufacturer: "ABB", model: "TX", location: "Trạm Điện" },
    { name: "Xe Nâng", manufacturer: "Toyota", model: "8FD", location: "Kho Thành Phẩm" },
    { name: "Băng Tải", manufacturer: "Nội Bộ", model: "CONV", location: "Line Đóng Gói" },
  ];

  for (let i = 7; i <= 125; i += 1) {
    const template = machineTemplates[(i - 1) % machineTemplates.length];
    const code = `MC-${pad(i)}`;
    const status = getStatus(i);
    assets.push({
      assetCode: code,
      name: `${template.name} ${Math.ceil(i / machineTemplates.length)}`,
      assetType: "machine",
      status,
      purchaseDate: makePurchaseDate(i),
      purchasePrice: 700000000 + ((i % 10) * 430000000),
      location: template.location,
      manufacturer: template.manufacturer,
      model: `${template.model}-${pad(i, 2)}`,
      serialNumber: code,
    });
    machineDetails.push({
      assetCode: code,
      spindleHours: 240 + i * 11,
      cycleCount: 1800 + i * 37,
      oee_availability: 82 + (i % 12),
      oee_performance: 80 + (i % 10),
      oee_quality: 92 + (i % 7),
      alarmCode: status === "in_repair" ? `ALARM-${pad(i, 4)}` : "",
      pmIntervalHours: 500,
      pmIntervalDays: 90,
    });
  }

  for (let i = 6; i <= 125; i += 1) {
    const template = moldTemplates[(i - 1) % moldTemplates.length];
    const code = `MD-${pad(i)}`;
    const status = getStatus(i + 3);
    assets.push({
      assetCode: code,
      name: `${template.name} ${Math.ceil(i / moldTemplates.length)}`,
      assetType: "mold",
      status,
      purchaseDate: makePurchaseDate(i + 30),
      purchasePrice: 500000000 + ((i % 8) * 95000000),
      location: template.location,
      manufacturer: "Nội Bộ",
      model: `${template.model}-${pad(i, 2)}`,
      serialNumber: code,
    });
    moldDetails.push({
      assetCode: code,
      totalShots: 70000 + i * 4200,
      shotLimit: 300000 + ((i % 5) * 100000),
      currentMachineCode: `MC-${pad(((i - 1) % 125) + 1)}`,
      storageLocation: `${template.location} - Kệ ${((i - 1) % 8) + 1}`,
      lastMaintenanceShot: 50000 + i * 3800,
    });
  }

  for (let i = 6; i <= 125; i += 1) {
    const template = jigTemplates[(i - 1) % jigTemplates.length];
    const code = `JT-${pad(i)}`;
    const status = getStatus(i + 6);
    const isGauge = template.name === "Gauge / Dưỡng Đo";
    assets.push({
      assetCode: code,
      name: `${template.name} ${Math.ceil(i / jigTemplates.length)}`,
      assetType: "jig_tool",
      status,
      purchaseDate: makePurchaseDate(i + 60),
      purchasePrice: template.name === "Đồ Gá Gia Công" ? 25000000 + i * 500000 : 500000 + i * 20000,
      location: template.location,
      manufacturer: template.manufacturer,
      model: `${template.model}-${pad(i, 2)}`,
      serialNumber: code,
    });
    jigDetails.push({
      assetCode: code,
      usageCount: 50 + i * 8,
      sharpenCount: i % 12,
      sharpenLimit: isGauge ? 0 : 10 + (i % 16),
      calibrationDate: isGauge ? makePurchaseDate(i + 12) : null,
      nextCalibrationDate: isGauge ? makePurchaseDate(i + 15) : null,
      checkedOutByEmail: i % 2 === 0 ? "tech2@factory.local" : "tech1@factory.local",
      checkedOutMachineCode: `MC-${pad(((i + 7) % 125) + 1)}`,
    });
  }

  for (let i = 6; i <= 125; i += 1) {
    const template = infraTemplates[(i - 1) % infraTemplates.length];
    const code = `IF-${pad(i)}`;
    const status = getStatus(i + 9);
    assets.push({
      assetCode: code,
      name: `${template.name} ${Math.ceil(i / infraTemplates.length)}`,
      assetType: "infrastructure",
      status,
      purchaseDate: makePurchaseDate(i + 90),
      purchasePrice: 180000000 + i * 12000000,
      location: template.location,
      manufacturer: template.manufacturer,
      model: `${template.model}-${pad(i, 2)}`,
      serialNumber: code,
    });
    infraDetails.push({
      assetCode: code,
      operatingHours: 400 + i * 28,
      pmIntervalDays: i % 3 === 0 ? 365 : 180,
      lastInspectionDate: makePurchaseDate(i + 6),
      nextInspectionDate: makePurchaseDate(i + 12),
    });
  }

  return { assets, machineDetails, moldDetails, jigDetails, infraDetails };
}

function buildPmSchedules(assetRows, detailRowsByType) {
  const schedules = [];

  assetRows.forEach((asset) => {
    if (asset.status === "disposed") return;

    if (asset.assetType === "machine") {
      const detail = detailRowsByType.machine[asset.assetCode];
      schedules.push(
        {
          assetCode: asset.assetCode,
          triggerType: "hours",
          intervalValue: 500,
          lastTriggeredValue: Math.max(0, detail.spindleHours - 500),
        },
        {
          assetCode: asset.assetCode,
          triggerType: "days",
          intervalValue: 90,
          lastTriggeredValue: 19700 + (parseInt(asset.assetCode.slice(-3), 10) % 30),
        }
      );
    }

    if (asset.assetType === "mold") {
      const detail = detailRowsByType.mold[asset.assetCode];
      schedules.push({
        assetCode: asset.assetCode,
        triggerType: "shots",
        intervalValue: 50000,
        lastTriggeredValue: detail.lastMaintenanceShot,
      });
    }

    if (asset.assetType === "jig_tool") {
      const detail = detailRowsByType.jig[asset.assetCode];
      if (detail.calibrationDate) {
        schedules.push({
          assetCode: asset.assetCode,
          triggerType: "days",
          intervalValue: 90,
          lastTriggeredValue: 19700 + (parseInt(asset.assetCode.slice(-3), 10) % 20),
        });
      } else {
        schedules.push({
          assetCode: asset.assetCode,
          triggerType: "usage_count",
          intervalValue: 100,
          lastTriggeredValue: Math.max(0, detail.usageCount - 100),
        });
      }
    }

    if (asset.assetType === "infrastructure") {
      const detail = detailRowsByType.infra[asset.assetCode];
      schedules.push({
        assetCode: asset.assetCode,
        triggerType: "days",
        intervalValue: detail.pmIntervalDays,
        lastTriggeredValue: 19700 + (parseInt(asset.assetCode.slice(-3), 10) % 25),
      });
    }
  });

  return schedules;
}

function buildHistoryData(assetDocs, byEmail, detailRowsByType) {
  const workOrders = [];
  const maintenanceLogs = [];
  const spareParts = [];
  let woIndex = 1;

  assetDocs
    .filter((asset) => asset.status !== "disposed")
    .forEach((asset, index) => {
      const startedAt = makeHistoryDate(index + 1);
      const completedAt = new Date(startedAt.getTime() + ((index % 6) + 2) * 60 * 60 * 1000);
      const priority = ["low", "medium", "high", "urgent"][index % 4];
      const assignedTech = index % 2 === 0 ? byEmail["tech1@factory.local"] : byEmail["tech2@factory.local"];
      let triggerSource = "pm_schedule";
      let woType = "PM";
      let createdBy = byEmail["admin@factory.local"]._id;

      if (asset.assetType === "machine" && index % 3 === 0) {
        triggerSource = "machine_alert";
        woType = "CM";
        createdBy = byEmail["tech1@factory.local"]._id;
      } else if (index % 5 === 0) {
        triggerSource = "production_request";
        woType = "CM";
        createdBy = byEmail["manager@factory.local"]._id;
      }

      const workOrderId = new mongoose.Types.ObjectId();
      workOrders.push({
        _id: workOrderId,
        woCode: makeWoCode(woIndex),
        woType,
        triggerSource,
        priority,
        status: "done",
        assetId: asset._id,
        createdBy,
        assignedTo: assignedTech._id,
        approvedBy: priority === "urgent" ? byEmail["manager@factory.local"]._id : byEmail["admin@factory.local"]._id,
        rejectedReason: "",
        scheduledDate: startedAt,
        startedAt,
        completedAt,
        laborHours: Number((2 + (index % 5) * 1.25).toFixed(2)),
        qcSignOff: true,
      });

      let shotAtMaintenance = null;
      if (asset.assetType === "mold") {
        shotAtMaintenance = detailRowsByType.mold[asset.assetCode]?.lastMaintenanceShot || null;
      }

      maintenanceLogs.push({
        workOrderId,
        assetId: asset._id,
        technicianId: assignedTech._id,
        completedAt,
        laborHours: Number((2 + (index % 5) * 1.25).toFixed(2)),
        findings:
          asset.assetType === "machine"
            ? "Đã kiểm tra alarm, vệ sinh và xác nhận thông số vận hành."
            : asset.assetType === "mold"
              ? "Đã vệ sinh khuôn, kiểm tra bề mặt và xác nhận số shot."
              : asset.assetType === "jig_tool"
                ? "Đã thay/hiệu chỉnh dụng cụ và xác nhận trạng thái sử dụng."
                : "Đã kiểm tra an toàn, xác nhận tiện ích hoạt động ổn định.",
        shotAtMaintenance,
      });

      spareParts.push({
        workOrderId,
        partName:
          asset.assetType === "machine"
            ? "Dầu bôi trơn"
            : asset.assetType === "mold"
              ? "Mỡ khuôn"
              : asset.assetType === "jig_tool"
                ? "Insert thay thế"
                : "Lọc gió",
        qty: (index % 3) + 1,
        unitCost:
          asset.assetType === "machine"
            ? 350000
            : asset.assetType === "mold"
              ? 180000
              : asset.assetType === "jig_tool"
                ? 220000
                : 450000,
      });

      woIndex += 1;
    });

  const workflowExamples = [
    {
      woCode: makeWoCode(woIndex++),
      woType: "CM",
      triggerSource: "machine_alert",
      priority: "urgent",
      status: "approved",
      assetId: assetDocs.find((asset) => asset.assetCode === "MC-002")._id,
      createdBy: byEmail["tech1@factory.local"]._id,
      assignedTo: byEmail["tech1@factory.local"]._id,
      approvedBy: byEmail["manager@factory.local"]._id,
      rejectedReason: "",
      scheduledDate: null,
      startedAt: null,
      completedAt: null,
      laborHours: 0,
      qcSignOff: false,
    },
    {
      woCode: makeWoCode(woIndex++),
      woType: "PM",
      triggerSource: "pm_schedule",
      priority: "medium",
      status: "pending_approval",
      assetId: assetDocs.find((asset) => asset.assetCode === "MD-002")._id,
      createdBy: byEmail["admin@factory.local"]._id,
      assignedTo: null,
      approvedBy: null,
      rejectedReason: "",
      scheduledDate: null,
      startedAt: null,
      completedAt: null,
      laborHours: 0,
      qcSignOff: false,
    },
    {
      woCode: makeWoCode(woIndex++),
      woType: "CM",
      triggerSource: "production_request",
      priority: "high",
      status: "rejected",
      assetId: assetDocs.find((asset) => asset.assetCode === "JT-002")._id,
      createdBy: byEmail["manager@factory.local"]._id,
      assignedTo: null,
      approvedBy: null,
      rejectedReason: "Thiếu thông tin vật tư và phạm vi công việc.",
      scheduledDate: null,
      startedAt: null,
      completedAt: null,
      laborHours: 0,
      qcSignOff: false,
    },
    {
      woCode: makeWoCode(woIndex++),
      woType: "CM",
      triggerSource: "production_request",
      priority: "low",
      status: "draft",
      assetId: assetDocs.find((asset) => asset.assetCode === "IF-004")._id,
      createdBy: byEmail["manager@factory.local"]._id,
      assignedTo: null,
      approvedBy: null,
      rejectedReason: "",
      scheduledDate: null,
      startedAt: null,
      completedAt: null,
      laborHours: 0,
      qcSignOff: false,
    },
    {
      woCode: makeWoCode(woIndex++),
      woType: "CM",
      triggerSource: "machine_alert",
      priority: "urgent",
      status: "in_progress",
      assetId: assetDocs.find((asset) => asset.assetCode === "MC-003")._id,
      createdBy: byEmail["tech2@factory.local"]._id,
      assignedTo: byEmail["tech2@factory.local"]._id,
      approvedBy: byEmail["manager@factory.local"]._id,
      rejectedReason: "",
      scheduledDate: new Date("2026-04-08T08:00:00.000Z"),
      startedAt: new Date("2026-04-08T09:00:00.000Z"),
      completedAt: null,
      laborHours: 0,
      qcSignOff: false,
    },
  ];

  return { workOrders: [...workOrders, ...workflowExamples], maintenanceLogs, spareParts };
}

async function seed() {
  const env = getEnv();
  await connectDb(env.mongoUri);

  await Promise.all([
    SparePartUsed.deleteMany({}),
    MaintenanceLog.deleteMany({}),
    WorkOrder.deleteMany({}),
    PmSchedule.deleteMany({}),
    MachineDetail.deleteMany({}),
    MoldDetail.deleteMany({}),
    JigDetail.deleteMany({}),
    InfraDetail.deleteMany({}),
    Asset.deleteMany({}),
    User.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash("password123", 10);
  const users = await User.insertMany(
    USERS_DATA.map((user) => ({ ...user, passwordHash, isActive: true }))
  );
  const byEmail = Object.fromEntries(users.map((user) => [user.email, user]));

  const extra = buildExtraAssets();
  const allAssetRows = [...BASE_ASSETS, ...extra.assets];
  const assets = await Asset.insertMany(allAssetRows);
  const byCode = Object.fromEntries(assets.map((asset) => [asset.assetCode, asset]));

  const allMachineDetails = [...BASE_MACHINE_DETAILS, ...extra.machineDetails];
  const allMoldDetails = [...BASE_MOLD_DETAILS, ...extra.moldDetails];
  const allJigDetails = [...BASE_JIG_DETAILS, ...extra.jigDetails];
  const allInfraDetails = [...BASE_INFRA_DETAILS, ...extra.infraDetails];

  const machineDetailDocs = allMachineDetails.map((row) => ({
    assetId: byCode[row.assetCode]._id,
    spindleHours: row.spindleHours,
    cycleCount: row.cycleCount,
    oee_availability: row.oee_availability,
    oee_performance: row.oee_performance,
    oee_quality: row.oee_quality,
    alarmCode: row.alarmCode,
    pmIntervalHours: row.pmIntervalHours,
    pmIntervalDays: row.pmIntervalDays,
  }));

  const moldDetailDocs = allMoldDetails.map((row) => ({
    assetId: byCode[row.assetCode]._id,
    totalShots: row.totalShots,
    shotLimit: row.shotLimit,
    currentMachineId: byCode[row.currentMachineCode]?._id || null,
    storageLocation: row.storageLocation,
    lastMaintenanceShot: row.lastMaintenanceShot,
  }));

  const jigDetailDocs = allJigDetails.map((row) => ({
    assetId: byCode[row.assetCode]._id,
    usageCount: row.usageCount,
    sharpenCount: row.sharpenCount,
    sharpenLimit: row.sharpenLimit,
    calibrationDate: row.calibrationDate,
    nextCalibrationDate: row.nextCalibrationDate,
    checkedOutBy: byEmail[row.checkedOutByEmail]?._id || null,
    checkedOutMachineId: byCode[row.checkedOutMachineCode]?._id || null,
  }));

  const infraDetailDocs = allInfraDetails.map((row) => ({
    assetId: byCode[row.assetCode]._id,
    operatingHours: row.operatingHours,
    pmIntervalDays: row.pmIntervalDays,
    lastInspectionDate: row.lastInspectionDate,
    nextInspectionDate: row.nextInspectionDate,
  }));

  await MachineDetail.insertMany(machineDetailDocs);
  await MoldDetail.insertMany(moldDetailDocs);
  await JigDetail.insertMany(jigDetailDocs);
  await InfraDetail.insertMany(infraDetailDocs);

  const detailRowsByType = {
    machine: Object.fromEntries(allMachineDetails.map((row) => [row.assetCode, row])),
    mold: Object.fromEntries(allMoldDetails.map((row) => [row.assetCode, row])),
    jig: Object.fromEntries(allJigDetails.map((row) => [row.assetCode, row])),
    infra: Object.fromEntries(allInfraDetails.map((row) => [row.assetCode, row])),
  };

  const pmScheduleDocs = buildPmSchedules(allAssetRows, detailRowsByType).map((row) => ({
    assetId: byCode[row.assetCode]._id,
    triggerType: row.triggerType,
    intervalValue: row.intervalValue,
    lastTriggeredValue: row.lastTriggeredValue,
    nextDueValue: row.lastTriggeredValue + row.intervalValue,
    isActive: true,
  }));
  const pmSchedules = await PmSchedule.insertMany(pmScheduleDocs);

  const historyData = buildHistoryData(assets, byEmail, detailRowsByType);
  const workOrders = await WorkOrder.insertMany(historyData.workOrders);
  await MaintenanceLog.insertMany(historyData.maintenanceLogs);
  await SparePartUsed.insertMany(historyData.spareParts);

  console.log("Seed thành công.");
  console.log(`Users: ${users.length}`);
  console.log(`Assets: ${assets.length}`);
  console.log(`PM Schedules: ${pmSchedules.length}`);
  console.log(`Work Orders: ${workOrders.length}`);
  console.log("Quy mô dữ liệu giả lập: 500 assets, có lịch sử WO nhiều năm.");
  console.log("Tài khoản admin: admin@factory.local / password123");

  await disconnectDb();
}

seed().catch(async (error) => {
  console.error("Seed thất bại:", error.message);
  await disconnectDb();
  process.exit(1);
});
