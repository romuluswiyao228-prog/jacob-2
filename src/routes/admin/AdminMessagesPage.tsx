import { useState, useEffect, useCallback, useMemo } from "react";
import {
  MessageSquare,
  Mail,
  CheckCircle2,
  Trash2,
  Clock,
  Eye,
  Undo2,
  Copy,
  Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import styles from "./AdminMessagesPage.module.css";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  status?: "unread" | "read" | "processed" | "archived" | string;
  created_at: string;
  updated_at?: string;
}

export default function AdminMessagesPage() {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "processed">("all");

  // Reader Modal
  const [activeMessage, setActiveMessage] = useState<ContactMessage | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (err) throw err;
      setMessages(data as ContactMessage[]);
    } catch (e: unknown) {
      console.error("Erreur de chargement des messages", e);
      setError("Impossible de charger les messages de contact.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Open Message Reader & Mark as read automatically
  const handleOpenMessage = async (msg: ContactMessage) => {
    setActiveMessage(msg);

    // If message is unread, mark it as read
    if (!msg.is_read || msg.status === "unread") {
      try {
        const { error: err } = await supabase
          .from("contact_messages")
          .update({
            is_read: true,
            status: msg.status === "processed" ? "processed" : "read",
          })
          .eq("id", msg.id);

        if (!err) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msg.id
                ? {
                    ...m,
                    is_read: true,
                    status: m.status === "processed" ? "processed" : "read",
                  }
                : m
            )
          );
        }
      } catch (e) {
        console.error("Erreur mise à jour lecture", e);
      }
    }
  };

  // Toggle Processed
  const handleToggleProcessed = async (msg: ContactMessage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const isCurrentlyProcessed = msg.status === "processed";
    const nextStatus = isCurrentlyProcessed ? "read" : "processed";

    try {
      const { error: err } = await supabase
        .from("contact_messages")
        .update({
          status: nextStatus,
          is_read: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", msg.id);

      if (err) throw err;

      const updated = {
        ...msg,
        status: nextStatus,
        is_read: true,
      };

      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? updated : m))
      );

      if (activeMessage && activeMessage.id === msg.id) {
        setActiveMessage(updated);
      }

      showToast(
        nextStatus === "processed"
          ? "Message marqué comme traité"
          : "Message replacé en attente",
        "success"
      );
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Erreur lors du traitement.";
      showToast(errMsg, "error");
    }
  };

  // Delete message
  const handleDelete = async (msg: ContactMessage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!window.confirm(`Supprimer définitivement le message de ${msg.name} ?`)) {
      return;
    }

    try {
      const { error: err } = await supabase
        .from("contact_messages")
        .delete()
        .eq("id", msg.id);

      if (err) throw err;

      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      if (activeMessage && activeMessage.id === msg.id) {
        setActiveMessage(null);
      }

      showToast("Message supprimé avec succès", "success");
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Erreur lors de la suppression.";
      showToast(errMsg, "error");
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    showToast("Adresse e-mail copiée", "info");
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  // Filtered List & Counts
  const { filteredMessages, pendingCount, processedCount, totalCount } = useMemo(() => {
    let pending = 0;
    let processed = 0;

    messages.forEach((m) => {
      if (m.status === "processed") {
        processed++;
      } else {
        pending++;
      }
    });

    const s = search.trim().toLowerCase();
    const filtered = messages.filter((m) => {
      // Tab
      if (activeTab === "pending" && m.status === "processed") return false;
      if (activeTab === "processed" && m.status !== "processed") return false;

      // Search
      if (s) {
        const matchName = m.name.toLowerCase().includes(s);
        const matchEmail = m.email.toLowerCase().includes(s);
        const matchSubject = m.subject.toLowerCase().includes(s);
        const matchBody = m.message.toLowerCase().includes(s);
        if (!matchName && !matchEmail && !matchSubject && !matchBody) return false;
      }

      return true;
    });

    return {
      filteredMessages: filtered,
      pendingCount: pending,
      processedCount: processed,
      totalCount: messages.length,
    };
  }, [messages, search, activeTab]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Messages de contact</h1>
          <p className={styles.subtitle}>
            Demandes clients, questions sur les produits et suivis reçus via le formulaire public.
          </p>
        </div>

        <div className={styles.statsBar}>
          <div className={`${styles.statPill} ${pendingCount > 0 ? styles.statPillActive : ""}`}>
            <Clock size={14} />
            <span>{pendingCount} non traité{pendingCount > 1 ? "s" : ""}</span>
          </div>
          <div className={styles.statPill}>
            <CheckCircle2 size={14} color="var(--color-success)" />
            <span>{processedCount} traité{processedCount > 1 ? "s" : ""}</span>
          </div>
        </div>
      </header>

      {error && <div className={styles.alertBox}>{error}</div>}

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.tabsGroup}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "all" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("all")}
          >
            Tous ({totalCount})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "pending" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            À traiter ({pendingCount})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "processed" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("processed")}
          >
            Traités ({processedCount})
          </button>
        </div>

        <input
          type="text"
          placeholder="Rechercher par expéditeur, sujet ou mot-clé..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {loading ? (
        <p style={{ color: "var(--color-neutral-400)" }}>Chargement des messages…</p>
      ) : filteredMessages.length === 0 ? (
        <div className={styles.emptyState}>
          <MessageSquare size={36} color="var(--color-neutral-500)" style={{ margin: "0 auto 12px" }} />
          <p>Aucun message dans cette vue.</p>
          {search && (
            <p style={{ color: "var(--color-neutral-400)", fontSize: "0.85rem", marginTop: 4 }}>
              Essayez de modifier votre recherche.
            </p>
          )}
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Statut</th>
                <th>Expéditeur</th>
                <th>Objet & Message</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMessages.map((msg) => {
                const isUnread = !msg.is_read || msg.status === "unread";
                const isProcessed = msg.status === "processed";

                return (
                  <tr
                    key={msg.id}
                    className={`${isUnread ? styles.rowUnread : ""} ${
                      isProcessed ? styles.rowProcessed : ""
                    }`}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleOpenMessage(msg)}
                  >
                    <td>
                      {isProcessed ? (
                        <span className={`${styles.statusBadge} ${styles.badgeProcessed}`}>
                          ✓ Traité
                        </span>
                      ) : isUnread ? (
                        <span className={`${styles.statusBadge} ${styles.badgeUnread}`}>
                          ● Non lu
                        </span>
                      ) : (
                        <span className={`${styles.statusBadge} ${styles.badgeRead}`}>
                          Lu
                        </span>
                      )}
                    </td>

                    <td>
                      <div className={styles.senderName}>{msg.name}</div>
                      <div className={styles.senderEmail}>{msg.email}</div>
                    </td>

                    <td>
                      <div className={styles.subjectText}>{msg.subject}</div>
                      <div className={styles.messageExcerpt}>{msg.message}</div>
                    </td>

                    <td>
                      <span className={styles.dateText}>
                        {new Date(msg.created_at).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>

                    <td>
                      <div className={styles.actionsCell} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${
                            isProcessed ? "" : styles.actionBtnSuccess
                          }`}
                          onClick={(e) => handleToggleProcessed(msg, e)}
                          title={isProcessed ? "Replacer en attente" : "Marquer comme traité"}
                        >
                          {isProcessed ? (
                            <>
                              <Undo2 size={13} />
                              <span>En attente</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={13} />
                              <span>Traité</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => handleOpenMessage(msg)}
                          title="Lire le message complet"
                        >
                          <Eye size={13} />
                        </button>

                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                          onClick={(e) => handleDelete(msg, e)}
                          title="Supprimer le message"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal / Reader Message */}
      {activeMessage && (
        <div className={styles.modalBackdrop} onClick={() => setActiveMessage(null)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={styles.modalTitle}>Lecture du message</span>
                {activeMessage.status === "processed" ? (
                  <span className={`${styles.statusBadge} ${styles.badgeProcessed}`}>
                    Traité
                  </span>
                ) : (
                  <span className={`${styles.statusBadge} ${styles.badgeRead}`}>
                    Lu
                  </span>
                )}
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setActiveMessage(null)}
              >
                &times;
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Sender Details Box */}
              <div className={styles.senderBox}>
                <div className={styles.senderDetails}>
                  <div style={{ fontWeight: "bold", color: "var(--color-text-inverse)", fontSize: "1rem" }}>
                    {activeMessage.name}
                  </div>
                  <div style={{ color: "var(--color-neutral-400)", fontSize: "0.85rem" }}>
                    {activeMessage.email}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => handleCopyEmail(activeMessage.email)}
                    title="Copier l'e-mail"
                  >
                    {copiedEmail ? (
                      <Check size={13} color="var(--color-success)" />
                    ) : (
                      <Copy size={13} />
                    )}
                    <span>Copier</span>
                  </button>
                  <a
                    href={`mailto:${activeMessage.email}?subject=${encodeURIComponent(
                      `Re: ${activeMessage.subject}`
                    )}`}
                    className={`${styles.actionBtn} ${styles.actionBtnSuccess}`}
                    style={{ textDecoration: "none" }}
                  >
                    <Mail size={13} />
                    <span>Répondre par e-mail</span>
                  </a>
                </div>
              </div>

              {/* Subject & Date */}
              <div>
                <h3 className={styles.messageSubject}>{activeMessage.subject}</h3>
                <div className={styles.messageDate}>
                  Reçu le{" "}
                  {new Date(activeMessage.created_at).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              {/* Message Content */}
              <div className={styles.messageBody}>
                {activeMessage.message}
              </div>
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                onClick={(e) => handleDelete(activeMessage, e)}
              >
                <Trash2 size={13} />
                <span>Supprimer</span>
              </button>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className={`${styles.actionBtn} ${
                    activeMessage.status === "processed"
                      ? ""
                      : styles.actionBtnSuccess
                  }`}
                  onClick={(e) => handleToggleProcessed(activeMessage, e)}
                >
                  {activeMessage.status === "processed" ? (
                    <>
                      <Undo2 size={14} />
                      <span>Replacer en attente</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Marquer comme traité</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => setActiveMessage(null)}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
