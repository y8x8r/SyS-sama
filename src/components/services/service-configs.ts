import type { ServiceConfig } from "./service-page";

/**
 * تكوين جميع الخدمات الـ 21 مع حقولها كما ورد في البرومبت — بالترتيب الحرفي نفسه.
 */

export const serviceConfigs: Record<string, ServiceConfig> = {
  // ========== الحج والعمرة ==========
  hajj_program: {
    serviceType: "hajj_program",
    labelKey: "nav_hajj_program",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "customerNumber", labelKey: "f_customer_number", type: "text" },
      { name: "passportNumber", labelKey: "f_passport", type: "text" },
      { name: "programName", labelKey: "f_program_name", type: "text", required: true, placeholder: "حج تمتع 2026" },
      { name: "programNumber", labelKey: "f_program_number", type: "text", placeholder: "PRG-HJJ-001" },
      { name: "programType", labelKey: "f_program_type", type: "select", options: [
        { value: "special", labelKey: "list_special" },
        { value: "group", labelKey: "list_group" },
      ] },
      { name: "agency", labelKey: "f_program_provider", type: "text", placeholder: "اسم الشركة" },
      { name: "startDate", labelKey: "f_start_date", type: "date" },
      { name: "endDate", labelKey: "f_end_date", type: "date" },
    ],
  },
  hajj_regular: {
    serviceType: "hajj_regular",
    labelKey: "nav_hajj_regular",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "customerNumber", labelKey: "f_customer_number", type: "text" },
      { name: "passportNumber", labelKey: "f_passport", type: "text" },
      { name: "authorizedAgency", labelKey: "f_authorized_agency", type: "text", placeholder: "اسم الوكالة المفوضة" },
    ],
  },
  umrah_program: {
    serviceType: "umrah_program",
    labelKey: "nav_umrah_program",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "customerNumber", labelKey: "f_customer_number", type: "text" },
      { name: "passportNumber", labelKey: "f_passport", type: "text" },
      { name: "programName", labelKey: "f_program_name", type: "text", required: true },
      { name: "programNumber", labelKey: "f_program_number", type: "text" },
      { name: "programType", labelKey: "f_program_type", type: "select", options: [
        { value: "special", labelKey: "list_special" },
        { value: "group", labelKey: "list_group" },
      ] },
      { name: "agency", labelKey: "f_program_provider", type: "text" },
      { name: "duration", labelKey: "f_program_duration", type: "text", placeholder: "10 أيام" },
      { name: "startDate", labelKey: "f_start_date", type: "date" },
      { name: "endDate", labelKey: "f_end_date", type: "date" },
      { name: "guarantorName", labelKey: "f_guarantor_name", type: "text" },
      { name: "guarantorNo", labelKey: "f_guarantor_number", type: "tel" },
      { name: "guarantorAddress", labelKey: "f_guarantor_address", type: "text" },
      { name: "guaranteeType", labelKey: "f_guarantee_type", type: "select", options: [
        { value: "personal", labelKey: "list_personal" },
        { value: "commercial", labelKey: "list_commercial" },
        { value: "government", labelKey: "list_government" },
      ] },
    ],
  },
  umrah_regular: {
    serviceType: "umrah_regular",
    labelKey: "nav_umrah_regular",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "customerNumber", labelKey: "f_customer_number", type: "text" },
      { name: "passportNumber", labelKey: "f_passport", type: "text" },
      { name: "agency", labelKey: "f_program_provider", type: "text", placeholder: "الوكالة المزوّدة للتأشيرة" },
      { name: "entryDate", labelKey: "f_entry_date", type: "date" },
      { name: "exitDate", labelKey: "f_exit_date", type: "date" },
      { name: "daysLeft", labelKey: "f_days_remaining", type: "text", computed: true },
      { name: "guarantorName", labelKey: "f_guarantor_name", type: "text" },
      { name: "guarantorNo", labelKey: "f_guarantor_number", type: "tel" },
      { name: "guarantorAddress", labelKey: "f_guarantor_address", type: "text" },
      { name: "guaranteeType", labelKey: "f_guarantee_type", type: "select", options: [
        { value: "commercial", labelKey: "list_commercial" },
        { value: "personal", labelKey: "list_personal" },
        { value: "government", labelKey: "list_government" },
      ] },
      { name: "visaStatus", labelKey: "f_visa_status", type: "select", options: [
        { value: "deported", labelKey: "list_deported" },
        { value: "in_embassy", labelKey: "list_in_embassy" },
        { value: "issued", labelKey: "list_issued" },
        { value: "sent_customer", labelKey: "list_sent_customer" },
      ] },
    ],
  },

  // ========== الجوازات ==========
  passport_attendance: {
    serviceType: "passport_attendance",
    labelKey: "nav_passport_attendance",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "phoneNumber", labelKey: "f_phone", type: "tel" },
      { name: "cardNumber", labelKey: "f_card_number", type: "text" },
      { name: "governorate", labelKey: "f_governorate", type: "select", options: [
        { value: "aden", labelKey: "gov_aden" },
        { value: "taiz", labelKey: "gov_taiz" },
        { value: "shabwa", labelKey: "gov_shabwa" },
        { value: "mahra", labelKey: "gov_mahra" },
        { value: "mokha", labelKey: "gov_mokha" },
        { value: "hadramaut", labelKey: "gov_hadramaut" },
        { value: "seiyun", labelKey: "gov_seiyun" },
        { value: "marib", labelKey: "gov_marib" },
      ] },
      { name: "receiveDate", labelKey: "f_receive_date", type: "date", placeholder: "تاريخ النزول" },
      { name: "arrivalDate", labelKey: "f_arrival_date", type: "date", placeholder: "تاريخ الوصول" },
      { name: "agentName", labelKey: "f_agent_name", type: "text" },
      { name: "agentNumber", labelKey: "f_agent_number", type: "tel" },
      { name: "passportStatus", labelKey: "f_passport_status", type: "select", options: [
        { value: "in_passport", labelKey: "list_in_passport" },
        { value: "issue", labelKey: "list_issue" },
        { value: "received", labelKey: "list_received" },
        { value: "in_office", labelKey: "list_in_office" },
        { value: "delivered", labelKey: "list_delivered" },
      ] },
    ],
  },
  passport_without: {
    serviceType: "passport_without",
    labelKey: "nav_passport_without",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "phoneNumber", labelKey: "f_phone", type: "tel" },
      { name: "cardNumber", labelKey: "f_card_number", type: "text" },
      { name: "agentName", labelKey: "f_agent_name", type: "text" },
      { name: "agentNumber", labelKey: "f_agent_number", type: "tel" },
      { name: "requestType", labelKey: "f_request_type", type: "select", options: [
        { value: "new", labelKey: "list_new" },
        { value: "renew", labelKey: "list_renew" },
      ] },
      { name: "requestStatus", labelKey: "f_request_status", type: "select", options: [
        { value: "deported", labelKey: "list_deported" },
        { value: "in_passport", labelKey: "list_in_passport" },
        { value: "in_office", labelKey: "list_in_office" },
      ] },
    ],
  },

  // ========== تذاكر الطيران ==========
  flight_ticket: {
    serviceType: "flight_ticket",
    labelKey: "nav_flight_ticket",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "customerNumber", labelKey: "f_customer_number", type: "text" },
      { name: "route", labelKey: "f_route", type: "text", placeholder: "عدن → القاهرة", required: true },
      { name: "company", labelKey: "f_company_name", type: "text" },
      { name: "ticketNo", labelKey: "f_ticket_number", type: "text" },
      { name: "ticketDate", labelKey: "f_ticket_date", type: "date" },
      { name: "departTime", labelKey: "f_departure_time", type: "datetime-local" },
      { name: "arrivalTime", labelKey: "f_arrival_time", type: "datetime-local" },
    ],
  },

  // ========== النقل الدولي والمحلي ==========
  intl_bus: {
    serviceType: "intl_bus",
    labelKey: "nav_intl_bus",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "customerNumber", labelKey: "f_customer_number", type: "text" },
      { name: "passportNumber", labelKey: "f_passport", type: "text" },
      { name: "companyName", labelKey: "f_company_name", type: "text" },
      { name: "route", labelKey: "f_route", type: "text", placeholder: "من ← إلى", required: true },
      { name: "tripDate", labelKey: "date", type: "date" },
      { name: "arrivalTime", labelKey: "f_arrival_time", type: "time" },
      { name: "departTime", labelKey: "f_departure_time", type: "time" },
      { name: "tripType", labelKey: "f_trip_type", type: "select", options: [
        { value: "regular", labelKey: "list_regular" },
        { value: "vip", labelKey: "list_vip" },
      ] },
    ],
  },
  intl_car: {
    serviceType: "intl_car",
    labelKey: "nav_intl_car",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "customerNumber", labelKey: "f_customer_number", type: "text" },
      { name: "passportNumber", labelKey: "f_passport", type: "text" },
      { name: "carType", labelKey: "f_car_type", type: "text" },
      { name: "carModel", labelKey: "f_car_model", type: "text" },
      { name: "route", labelKey: "f_route", type: "text", required: true },
      { name: "tripDate", labelKey: "date", type: "date" },
      { name: "arrivalTime", labelKey: "f_arrival_time", type: "time" },
      { name: "departTime", labelKey: "f_departure_time", type: "time" },
      { name: "departPlace", labelKey: "f_departure_place", type: "text" },
    ],
  },
  local_bus: {
    serviceType: "local_bus",
    labelKey: "nav_local_bus",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "customerNumber", labelKey: "f_customer_number", type: "text" },
      { name: "passportNumber", labelKey: "f_passport", type: "text" },
      { name: "driverName", labelKey: "f_driver_name", type: "text" },
      { name: "route", labelKey: "f_route", type: "text", required: true },
      { name: "tripDate", labelKey: "date", type: "date" },
      { name: "arrivalTime", labelKey: "f_arrival_time", type: "time" },
      { name: "departTime", labelKey: "f_departure_time", type: "time" },
      { name: "departPlace", labelKey: "f_departure_place", type: "text" },
    ],
  },
  local_car: {
    serviceType: "local_car",
    labelKey: "nav_local_car",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "customerNumber", labelKey: "f_customer_number", type: "text" },
      { name: "cardNumber", labelKey: "f_card_number", type: "text" },
      { name: "carType", labelKey: "f_car_type", type: "text" },
      { name: "carModel", labelKey: "f_car_model", type: "text" },
      { name: "route", labelKey: "f_route", type: "text", required: true },
      { name: "tripDate", labelKey: "date", type: "date" },
      { name: "arrivalTime", labelKey: "f_arrival_time", type: "time" },
      { name: "departTime", labelKey: "f_departure_time", type: "time" },
      { name: "departPlace", labelKey: "f_departure_place", type: "text" },
    ],
  },

  // ========== التأشيرات ==========
  visa_medical: {
    serviceType: "visa_medical",
    labelKey: "nav_visa_medical",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "customerNumber", labelKey: "f_customer_number", type: "text" },
      { name: "passportNumber", labelKey: "f_passport", type: "text" },
      { name: "diseaseName", labelKey: "f_disease_name", type: "text" },
      { name: "destination", labelKey: "f_destination", type: "text" },
      { name: "validity", labelKey: "f_visa_validity", type: "text", placeholder: "90 يوم" },
      { name: "deportDate", labelKey: "f_deport_date", type: "date" },
      { name: "processingPeriod", labelKey: "f_processing_period", type: "text" },
    ],
  },
  visa_tourist: {
    serviceType: "visa_tourist",
    labelKey: "nav_visa_tourist",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "customerNumber", labelKey: "f_customer_number", type: "text" },
      { name: "destination", labelKey: "f_destination", type: "text", required: true },
      { name: "passportNumber", labelKey: "f_passport", type: "text" },
      { name: "validity", labelKey: "f_visa_validity", type: "text" },
      { name: "processingPeriod", labelKey: "f_processing_period", type: "text" },
      { name: "deportDate", labelKey: "f_deport_date", type: "date" },
    ],
  },
  visa_work: {
    serviceType: "visa_work",
    labelKey: "nav_visa_work",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "customerNumber", labelKey: "f_customer_number", type: "text" },
      { name: "passportNumber", labelKey: "f_passport", type: "text" },
      { name: "visaType", labelKey: "f_visa_type", type: "select", options: [
        { value: "work_3m", labelKey: "list_work_3m" },
        { value: "work_self", labelKey: "list_work_self" },
        { value: "work_other", labelKey: "list_work_other" },
      ] },
      { name: "visaDuration", labelKey: "f_visa_duration", type: "text" },
      { name: "processingPeriod", labelKey: "f_processing_period", type: "text" },
      { name: "receiveDate", labelKey: "f_receive_date", type: "date" },
    ],
  },
  visa_visit: {
    serviceType: "visa_visit",
    labelKey: "nav_visa_visit",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "customerNumber", labelKey: "f_customer_number", type: "text" },
      { name: "passportNumber", labelKey: "f_passport", type: "text" },
      { name: "hostName", labelKey: "f_host_name", type: "text" },
      { name: "hostNo", labelKey: "f_host_number", type: "tel" },
      { name: "visaDuration", labelKey: "f_visa_duration", type: "text" },
      { name: "processingPeriod", labelKey: "f_processing_period", type: "text" },
      { name: "receiveDate", labelKey: "f_receive_date", type: "date" },
    ],
  },

  // ========== الشحن والتخليص ==========
  shipping: {
    serviceType: "shipping",
    labelKey: "nav_shipping",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "customerNumber", labelKey: "f_customer_number", type: "text" },
      { name: "shipmentType", labelKey: "f_shipment_type", type: "text" },
      { name: "shipmentWeight", labelKey: "f_shipment_weight", type: "text", placeholder: "25 كجم" },
      { name: "shippingType", labelKey: "f_shipping_type", type: "select", options: [
        { value: "air", labelKey: "list_air" },
        { value: "sea", labelKey: "list_sea" },
      ] },
      { name: "fromCountry", labelKey: "f_from_country", type: "text" },
      { name: "toCountry", labelKey: "f_to_country", type: "text" },
      { name: "receiveDateOffice", labelKey: "f_receive_date_office", type: "date" },
      { name: "sendDate", labelKey: "f_send_date", type: "date" },
      { name: "estArrival", labelKey: "f_estimated_arrival", type: "text" },
    ],
  },
  customs: {
    serviceType: "customs",
    labelKey: "nav_customs",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "customerNumber", labelKey: "f_customer_number", type: "text" },
      { name: "shipmentType", labelKey: "f_shipment_type", type: "text" },
      { name: "shipmentQty", labelKey: "f_shipment_qty", type: "text" },
      { name: "shipmentWeight", labelKey: "f_shipment_weight", type: "text" },
      { name: "customsPort", labelKey: "f_customs_port", type: "text" },
      { name: "clearancePrice", labelKey: "f_clearance_price", type: "number", placeholder: "0.00" },
    ],
  },

  // ========== المعاملات الخاصة ==========
  security_approval: {
    serviceType: "security_approval",
    labelKey: "nav_security_approval",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "customerNumber", labelKey: "f_customer_number", type: "text" },
      { name: "passportNumber", labelKey: "f_passport", type: "text" },
      { name: "country", labelKey: "f_country", type: "select", options: [
        { value: "egypt", labelKey: "egypt" },
        { value: "jordan", labelKey: "jordan" },
      ] },
      { name: "approvalType", labelKey: "f_approval_type", type: "select", options: [
        { value: "national_security", labelKey: "list_national_security" },
        { value: "digital", labelKey: "list_digital" },
        { value: "regular", labelKey: "list_normal_visa" },
      ] },
      { name: "approvalStatus", labelKey: "f_approval_status", type: "select", options: [
        { value: "emergency", labelKey: "list_emergency" },
        { value: "urgent", labelKey: "list_urgent" },
        { value: "regular", labelKey: "list_regular" },
      ] },
      { name: "deportDate", labelKey: "f_deport_date", type: "date" },
      { name: "estIssue", labelKey: "f_estimated_issue", type: "text" },
    ],
  },
  medical_report: {
    serviceType: "medical_report",
    labelKey: "nav_medical_report",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "customerNumber", labelKey: "f_customer_number", type: "text" },
      { name: "passportNumber", labelKey: "f_passport", type: "text" },
      { name: "reportCountry", labelKey: "f_report_country", type: "select", options: [
        { value: "egypt", labelKey: "egypt" },
        { value: "jordan", labelKey: "jordan" },
      ] },
      { name: "reportStatus", labelKey: "f_report_status", type: "select", options: [
        { value: "emergency", labelKey: "list_emergency_status" },
        { value: "urgent", labelKey: "list_urgent" },
        { value: "regular", labelKey: "list_regular" },
      ] },
      { name: "deportDate", labelKey: "f_deport_date", type: "date" },
      { name: "estIssue", labelKey: "f_estimated_issue", type: "text" },
    ],
  },
  travel_insurance: {
    serviceType: "travel_insurance",
    labelKey: "nav_travel_insurance",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "customerNumber", labelKey: "f_customer_number", type: "text", fromCustomer: "customerNumber" },
      { name: "insuredName", labelKey: "f_insured_name", type: "text", required: true },
      { name: "insuredNo", labelKey: "f_insured_number", type: "text" },
      { name: "passportNumber", labelKey: "f_passport", type: "text" },
      { name: "birthDate", labelKey: "f_birth_date", type: "date" },
      { name: "insuranceStart", labelKey: "f_insurance_start", type: "date" },
      { name: "insuranceEnd", labelKey: "f_insurance_end", type: "date" },
      { name: "tripType", labelKey: "f_trip_type", type: "text" },
    ],
  },
  hotel_booking: {
    serviceType: "hotel_booking",
    labelKey: "nav_hotel_booking",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "customerNumber", labelKey: "f_customer_number", type: "text" },
      { name: "passportNumber", labelKey: "f_passport", type: "text" },
      { name: "city", labelKey: "f_city", type: "text", placeholder: "جدة" },
      { name: "hotelName", labelKey: "f_hotel_name", type: "text" },
      { name: "arrivalDate", labelKey: "f_arrival_date", type: "date" },
      { name: "departureDate", labelKey: "f_departure_date", type: "date" },
      { name: "totalPrice", labelKey: "f_total_price", type: "number", placeholder: "0.00" },
      { name: "cancelPolicy", labelKey: "f_cancellation_policy", type: "select", options: [
        { value: "cancellable", labelKey: "list_cancellable" },
        { value: "non_cancellable", labelKey: "list_non_cancellable" },
      ] },
    ],
  },

  // ========== خدمات إضافية جديدة ==========

  // الفحص المهني
  professional_exam: {
    serviceType: "professional_exam",
    labelKey: "nav_professional_exam",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "passportNumber", labelKey: "f_passport", type: "text" },
      { name: "phoneNumber", labelKey: "f_phone", type: "tel", hideInForm: true },
      { name: "email", labelKey: "f_email", type: "text", placeholder: "email@example.com" },
      { name: "examProfession", labelKey: "f_exam_profession", type: "text", placeholder: "مثال: هندسة، طب..." },
      { name: "passwordField", labelKey: "f_password_field", type: "text", placeholder: "—" },
      { name: "departureDate", labelKey: "f_departure_date", type: "date" },
      { name: "returnDate", labelKey: "f_return_date", type: "date" },
    ],
  },

  // تفويض فيز
  visa_authorization: {
    serviceType: "visa_authorization",
    labelKey: "nav_visa_authorization",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "passportNumber", labelKey: "f_passport", type: "text" },
      { name: "phoneNumber", labelKey: "f_phone", type: "tel", hideInForm: true },
      { name: "requirements", labelKey: "f_requirements", type: "textarea", span2: true },
    ],
  },

  // تأشيرة عبور
  transit_visa: {
    serviceType: "transit_visa",
    labelKey: "nav_transit_visa",
    withFinance: true,
    fields: [
      { name: "customerName", labelKey: "f_customer_name", type: "text", fromCustomer: "fullName", required: true },
      { name: "passportNumber", labelKey: "f_passport", type: "text" },
      { name: "phoneNumber", labelKey: "f_phone", type: "tel", hideInForm: true },
      { name: "visaDuration", labelKey: "f_visa_duration", type: "text", placeholder: "مثال: 72 ساعة" },
      { name: "motherName", labelKey: "f_mother_name", type: "text" },
    ],
  },
};
