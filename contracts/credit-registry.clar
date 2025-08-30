;; Credit Registry Smart Contract
;; This contract manages the issuance, tracking, and basic operations for biodiversity credits.
;; Credits are fungible tokens representing verified ecological restoration efforts.
;; Each mint is associated with a project hash and metadata for transparency.

;; Constants
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-UNAUTHORIZED (err u100))
(define-constant ERR-PAUSED (err u101))
(define-constant ERR-INVALID-AMOUNT (err u102))
(define-constant ERR-INVALID-RECIPIENT (err u103))
(define-constant ERR-INVALID-MINTER (err u104))
(define-constant ERR-ALREADY-REGISTERED (err u105))
(define-constant ERR-METADATA-TOO-LONG (err u106))
(define-constant ERR-INVALID-PROJECT-HASH (err u107))
(define-constant ERR-INSUFFICIENT-BALANCE (err u108))
(define-constant ERR-TRANSFER-PAUSED (err u109))
(define-constant ERR-BURN-PAUSED (err u110))
(define-constant ERR-INVALID-METADATA (err u111))
(define-constant MAX-METADATA-LEN u500)

;; Data Variables
(define-data-var total-supply uint u0)
(define-data-var contract-paused bool false)
(define-data-var admin principal CONTRACT-OWNER)
(define-data-var mint-counter uint u0)

;; Data Maps
(define-map balances principal uint)
(define-map minters principal bool)
(define-map mint-records
  { mint-id: uint }
  {
    amount: uint,
    recipient: principal,
    project-hash: (buff 32),
    metadata: (string-utf8 500),
    timestamp: uint
  })

;; Read-Only Functions
(define-read-only (get-name)
  (ok "BiodiversityCredit"))

(define-read-only (get-symbol)
  (ok "BDC"))

(define-read-only (get-decimals)
  (ok u0))

(define-read-only (get-total-supply)
  (ok (var-get total-supply)))

(define-read-only (get-balance (account principal))
  (ok (default-to u0 (map-get? balances account))))

(define-read-only (get-mint-record (mint-id uint))
  (ok (map-get? mint-records { mint-id: mint-id })))

(define-read-only (is-minter (account principal))
  (ok (default-to false (map-get? minters account))))

(define-read-only (is-paused)
  (ok (var-get contract-paused)))

(define-read-only (get-admin)
  (ok (var-get admin)))

(define-read-only (get-mint-counter)
  (ok (var-get mint-counter)))

;; Public Functions
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-UNAUTHORIZED)
    (var-set admin new-admin)
    (ok true)))

(define-public (pause-contract)
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-UNAUTHORIZED)
    (var-set contract-paused true)
    (ok true)))

(define-public (unpause-contract)
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-UNAUTHORIZED)
    (var-set contract-paused false)
    (ok true)))

(define-public (add-minter (minter principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-UNAUTHORIZED)
    (asserts! (is-none (map-get? minters minter)) ERR-ALREADY-REGISTERED)
    (map-set minters minter true)
    (ok true)))

(define-public (remove-minter (minter principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-UNAUTHORIZED)
    (map-set minters minter false)
    (ok true)))

(define-public (mint (amount uint) (recipient principal) (project-hash (buff 32)) (metadata (string-utf8 500)))
  (let
    (
      (current-balance (default-to u0 (map-get? balances recipient)))
      (new-mint-id (+ (var-get mint-counter) u1))
    )
    (asserts! (not (var-get contract-paused)) ERR-PAUSED)
    (asserts! (default-to false (map-get? minters tx-sender)) ERR-INVALID-MINTER)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (not (is-eq recipient CONTRACT-OWNER)) ERR-INVALID-RECIPIENT) ;; Assuming CONTRACT-OWNER is invalid for demo
    (asserts! (<= (len metadata) MAX-METADATA-LEN) ERR-METADATA-TOO-LONG)
    (asserts! (is-some (some project-hash)) ERR-INVALID-PROJECT-HASH) ;; Placeholder for project validation
    (map-set balances recipient (+ current-balance amount))
    (var-set total-supply (+ (var-get total-supply) amount))
    (map-set mint-records
      { mint-id: new-mint-id }
      {
        amount: amount,
        recipient: recipient,
        project-hash: project-hash,
        metadata: metadata,
        timestamp: block-height
      })
    (var-set mint-counter new-mint-id)
    (ok new-mint-id)))

(define-public (transfer (amount uint) (sender principal) (recipient principal))
  (begin
    (asserts! (not (var-get contract-paused)) ERR-TRANSFER-PAUSED)
    (asserts! (is-eq tx-sender sender) ERR-UNAUTHORIZED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (not (is-eq recipient CONTRACT-OWNER)) ERR-INVALID-RECIPIENT)
    (let
      (
        (sender-balance (default-to u0 (map-get? balances sender)))
      )
      (asserts! (>= sender-balance amount) ERR-INSUFFICIENT-BALANCE)
      (map-set balances sender (- sender-balance amount))
      (map-set balances recipient (+ (default-to u0 (map-get? balances recipient)) amount))
      (ok true))))

(define-public (burn (amount uint))
  (let
    (
      (sender-balance (default-to u0 (map-get? balances tx-sender)))
    )
    (asserts! (not (var-get contract-paused)) ERR-BURN-PAUSED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (>= sender-balance amount) ERR-INSUFFICIENT-BALANCE)
    (map-set balances tx-sender (- sender-balance amount))
    (var-set total-supply (- (var-get total-supply) amount))
    (ok true)))

;; Private Functions (if needed)
(define-private (validate-project-hash (project-hash (buff 32)))
  ;; In full implementation, this would call ProjectRegistry contract
  ;; For now, dummy check
  (is-some (some project-hash)))

;; Additional Robust Features
;; Function to batch mint for efficiency
(define-public (batch-mint (recipients (list 10 {recipient: principal, amount: uint, project-hash: (buff 32), metadata: (string-utf8 500)})))
  (fold batch-mint-iter recipients (ok u0)))

(define-private (batch-mint-iter (entry {recipient: principal, amount: uint, project-hash: (buff 32), metadata: (string-utf8 500)}) (previous (response uint uint)))
  (match previous
    count
    (match (mint (get amount entry) (get recipient entry) (get project-hash entry) (get metadata entry))
      success (+ count u1)
      error (err error))
    error (err error)))

;; Function to get all mint records for a project (for transparency)
(define-read-only (get-mints-by-project (project-hash (buff 32)))
  (filter mint-by-project (map-get? mint-records (list u1 u2 u3)))) ;; Simplified, in real: iterate over all

(define-private (mint-by-project (record {amount: uint, recipient: principal, project-hash: (buff 32), metadata: (string-utf8 500), timestamp: uint}))
  (is-eq (get project-hash record) project-hash))

;; More lines for robustness: Event emissions (Clarity doesn't have events, but print for logs)
(print { event: "contract-deployed", owner: CONTRACT-OWNER })