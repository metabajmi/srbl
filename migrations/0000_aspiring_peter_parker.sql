CREATE TABLE "compliance_issues" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" varchar NOT NULL,
	"severity" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"affected_element" text,
	"regulation" text,
	"remediation" text NOT NULL,
	"article_reference" text,
	"remediation_template_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "compliance_scans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"status" text NOT NULL,
	"scan_date" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"overall_score" integer,
	"issues_count" integer DEFAULT 0,
	"critical_count" integer DEFAULT 0,
	"warning_count" integer DEFAULT 0,
	"suggestion_count" integer DEFAULT 0,
	"page_content" text,
	"analysis_result" jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "compliance_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"priority" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"assigned_to" text,
	"due_date" timestamp,
	"completed_at" timestamp,
	"attachments" jsonb,
	"checklist_items" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text,
	"user_email" text,
	"consent_type" text NOT NULL,
	"consent_given" text NOT NULL,
	"consent_date" timestamp DEFAULT now(),
	"ip_address" text,
	"user_agent" text,
	"consent_method" text,
	"expiry_date" timestamp,
	"withdrawn_at" timestamp,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "policy_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text NOT NULL,
	"website_url" text NOT NULL,
	"business_type" text NOT NULL,
	"responsible_department" text,
	"address" text,
	"contact_phone" text,
	"contact_email" text NOT NULL,
	"license_number" text,
	"data_types" jsonb NOT NULL,
	"data_usage_purposes" jsonb NOT NULL,
	"has_third_party_sharing" text NOT NULL,
	"retention_period" text NOT NULL,
	"data_collection_methods" text,
	"indirect_data_sources" text,
	"data_usage_details" text,
	"disclosure_details" text,
	"third_party_categories" text,
	"storage_location" text,
	"security_measures" text,
	"dpo_name" text,
	"dpo_address" text,
	"dpo_phone" text,
	"dpo_email" text,
	"last_updated_date" timestamp,
	"generated_content" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "remediation_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"issue" text NOT NULL,
	"arabic_title" text NOT NULL,
	"arabic_description" text NOT NULL,
	"remediation" text NOT NULL,
	"example_code" text,
	"regulations" jsonb
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" varchar NOT NULL,
	"generated_at" timestamp DEFAULT now(),
	"format" text NOT NULL,
	"content" jsonb,
	"file_name" text
);
--> statement-breakpoint
CREATE TABLE "terms_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text NOT NULL,
	"website_url" text NOT NULL,
	"business_type" text NOT NULL,
	"service_description" text NOT NULL,
	"has_user_accounts" text NOT NULL,
	"has_subscriptions" text NOT NULL,
	"payment_methods" jsonb,
	"refund_policy" text,
	"liability_limits" text,
	"governing_law" text DEFAULT 'Saudi Arabia' NOT NULL,
	"dispute_resolution" text,
	"contact_email" text NOT NULL,
	"generated_content" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "compliance_issues" ADD CONSTRAINT "compliance_issues_scan_id_compliance_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."compliance_scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_issues" ADD CONSTRAINT "compliance_issues_remediation_template_id_remediation_templates_id_fk" FOREIGN KEY ("remediation_template_id") REFERENCES "public"."remediation_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_scan_id_compliance_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."compliance_scans"("id") ON DELETE cascade ON UPDATE no action;