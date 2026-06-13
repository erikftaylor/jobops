import { Database } from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { OutputContract } from "../../shared/types.js";

interface CreateOutputContractInput {
  artifact_type:
    | "resume_pdf"
    | "resume_source"
    | "cover_letter_pdf"
    | "cover_letter_source"
    | "both_pdf";
  schema: Record<string, any>;
  required_fields: string[];
  optional_fields: string[];
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class OutputContractService {
  constructor(private db: Database) {}

  /**
   * Create a new output contract
   */
  createContract(input: CreateOutputContractInput): OutputContract {
    const id = uuidv4();

    const stmt = this.db.prepare(`
      INSERT INTO output_contracts (
        id, artifact_type, schema, required_fields, optional_fields
      ) VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.artifact_type,
      JSON.stringify(input.schema),
      JSON.stringify(input.required_fields),
      JSON.stringify(input.optional_fields)
    );

    return {
      id,
      artifact_type: input.artifact_type,
      schema: input.schema,
      required_fields: input.required_fields,
      optional_fields: input.optional_fields,
    };
  }

  /**
   * Get contract by artifact type
   */
  getContract(
    artifact_type:
      | "resume_pdf"
      | "resume_source"
      | "cover_letter_pdf"
      | "cover_letter_source"
      | "both_pdf"
  ): OutputContract | null {
    // First check if a contract is explicitly defined
    const stmt = this.db.prepare(
      "SELECT * FROM output_contracts WHERE artifact_type = ?"
    );
    const row = stmt.get(artifact_type) as any;

    if (row) {
      return this.rowToContract(row);
    }

    // Fall back to hardcoded contracts
    return this.getContractByType(artifact_type);
  }

  /**
   * Get contract by ID
   */
  getContractById(id: string): OutputContract | null {
    const stmt = this.db.prepare("SELECT * FROM output_contracts WHERE id = ?");
    const row = stmt.get(id) as any;
    return row ? this.rowToContract(row) : null;
  }

  /**
   * List all output contracts
   */
  listContracts(): OutputContract[] {
    const stmt = this.db.prepare("SELECT * FROM output_contracts");
    const rows = stmt.all() as any[];
    return rows.map((row) => this.rowToContract(row));
  }

  /**
   * Validate output against contract
   */
  validate(
    artifact_type:
      | "resume_pdf"
      | "resume_source"
      | "cover_letter_pdf"
      | "cover_letter_source"
      | "both_pdf",
    output: any
  ): ValidationResult {
    const contract = this.getContract(artifact_type);
    if (!contract) {
      return {
        valid: false,
        errors: [`No contract defined for artifact type: ${artifact_type}`],
      };
    }

    const errors: string[] = [];

    // Check required fields
    for (const field of contract.required_fields) {
      if (
        !(field in output) ||
        output[field] === undefined ||
        output[field] === null ||
        output[field] === ""
      ) {
        errors.push(`Required field missing: ${field}`);
      }
    }

    // Type checking (simplified)
    if (contract.schema.properties) {
      const properties = contract.schema.properties as Record<string, any>;

      for (const [field, fieldSchema] of Object.entries(properties)) {
        if (field in output && output[field] !== undefined && output[field] !== null) {
          const value = output[field];

          if (fieldSchema.type) {
            const actualType = Array.isArray(value)
              ? "array"
              : value === null
                ? "null"
                : typeof value;

            if (actualType !== fieldSchema.type) {
              // Allow some coercion
              if (
                !(
                  fieldSchema.type === "string" &&
                  (typeof value === "number" || typeof value === "boolean")
                )
              ) {
                errors.push(
                  `Field ${field} has wrong type: expected ${fieldSchema.type}, got ${actualType}`
                );
              }
            }
          }

          // Array items type checking
          if (
            fieldSchema.type === "array" &&
            Array.isArray(value) &&
            fieldSchema.items
          ) {
            for (let i = 0; i < value.length; i++) {
              const item = value[i];
              const itemSchema = fieldSchema.items;

              if (itemSchema.type) {
                const itemType = typeof item;
                if (itemType !== itemSchema.type && !(itemSchema.type === "string" && itemType === "number")) {
                  errors.push(
                    `Field ${field}[${i}] has wrong type: expected ${itemSchema.type}, got ${itemType}`
                  );
                }
              }
            }
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get JSON schema for an artifact type
   */
  getJsonSchema(
    artifact_type:
      | "resume_pdf"
      | "resume_source"
      | "cover_letter_pdf"
      | "cover_letter_source"
      | "both_pdf"
  ): Record<string, any> | null {
    const contract = this.getContract(artifact_type);
    return contract ? contract.schema : null;
  }

  /**
   * Initialize default contracts
   */
  initializeDefaultContracts(): void {
    // Resume contract
    const resumeContract = this.getContract("resume_source");
    if (!resumeContract) {
      this.createContract({
        artifact_type: "resume_source",
        schema: this.getResumeSchema(),
        required_fields: [
          "header",
          "contact",
          "summary",
          "experience",
          "education",
          "skills",
        ],
        optional_fields: ["certifications", "projects", "awards", "languages"],
      });
    }

    // Cover letter contract
    const coverLetterContract = this.getContract("cover_letter_source");
    if (!coverLetterContract) {
      this.createContract({
        artifact_type: "cover_letter_source",
        schema: this.getCoverLetterSchema(),
        required_fields: ["header", "date", "recipient", "body", "closing"],
        optional_fields: ["subject_line"],
      });
    }
  }

  /**
   * Private: Get contract by hardcoded type
   */
  private getContractByType(
    artifact_type:
      | "resume_pdf"
      | "resume_source"
      | "cover_letter_pdf"
      | "cover_letter_source"
      | "both_pdf"
  ): OutputContract | null {
    const baseType = artifact_type.split("_")[0]; // Extract "resume" or "cover_letter"

    if (baseType === "resume" || artifact_type === "both_pdf") {
      return {
        id: "hardcoded-resume",
        artifact_type: "resume_source",
        schema: this.getResumeSchema(),
        required_fields: [
          "header",
          "contact",
          "summary",
          "experience",
          "education",
          "skills",
        ],
        optional_fields: ["certifications", "projects", "awards", "languages"],
      };
    }

    if (baseType === "cover_letter") {
      return {
        id: "hardcoded-cover-letter",
        artifact_type: "cover_letter_source",
        schema: this.getCoverLetterSchema(),
        required_fields: ["header", "date", "recipient", "body", "closing"],
        optional_fields: ["subject_line"],
      };
    }

    return null;
  }

  /**
   * Private: Get resume JSON schema
   */
  private getResumeSchema(): Record<string, any> {
    return {
      type: "object",
      properties: {
        header: {
          type: "string",
          description: "Name and title header",
        },
        contact: {
          type: "object",
          properties: {
            email: { type: "string" },
            phone: { type: "string" },
            linkedin: { type: "string" },
            website: { type: "string" },
          },
        },
        summary: {
          type: "string",
          description: "Professional summary",
        },
        experience: {
          type: "array",
          items: {
            type: "object",
            properties: {
              company: { type: "string" },
              title: { type: "string" },
              duration: { type: "string" },
              description: { type: "string" },
              achievements: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
        education: {
          type: "array",
          items: {
            type: "object",
            properties: {
              school: { type: "string" },
              degree: { type: "string" },
              field: { type: "string" },
              year: { type: "string" },
            },
          },
        },
        skills: {
          type: "array",
          items: { type: "string" },
        },
        certifications: {
          type: "array",
          items: { type: "string" },
        },
        projects: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              technologies: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
      },
    };
  }

  /**
   * Private: Get cover letter JSON schema
   */
  private getCoverLetterSchema(): Record<string, any> {
    return {
      type: "object",
      properties: {
        header: {
          type: "string",
          description: "Sender contact information",
        },
        date: {
          type: "string",
          description: "Letter date",
        },
        recipient: {
          type: "object",
          properties: {
            name: { type: "string" },
            title: { type: "string" },
            company: { type: "string" },
            address: { type: "string" },
          },
        },
        greeting: {
          type: "string",
          description: "Salutation",
        },
        body: {
          type: "string",
          description: "Main letter content",
        },
        closing: {
          type: "string",
          description: "Sign-off",
        },
        subject_line: {
          type: "string",
          description: "Optional subject line",
        },
      },
    };
  }

  /**
   * Private: Convert database row to OutputContract
   */
  private rowToContract(row: any): OutputContract {
    return {
      id: row.id,
      artifact_type: row.artifact_type,
      schema: JSON.parse(row.schema),
      required_fields: JSON.parse(row.required_fields),
      optional_fields: JSON.parse(row.optional_fields),
    };
  }
}

/**
 * Factory function to create an OutputContractService instance
 */
export function createOutputContractService(db: Database): OutputContractService {
  return new OutputContractService(db);
}
