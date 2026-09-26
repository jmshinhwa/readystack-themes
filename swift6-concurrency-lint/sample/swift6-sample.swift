// swift-tools-version: 5.9
// SessionStore.swift — written fast, compiles under Swift 5, stops compiling under Swift 6.
@preconcurrency import Foundation
import Combine

var sharedCache: [String: Data] = [:]
var requestCount = 0

final class SessionStore: @unchecked Sendable {
    static var shared = SessionStore()

    nonisolated(unsafe) static var lastToken: String?

    private let queue = DispatchQueue(label: "session.store")
    private var tokens: [String] = []

    func token(for user: String) -> String? {
        return queue.sync {
            return tokens.first
        }
    }

    func refresh(completion: @escaping (Result<String, Error>) -> Void) {
        Task.detached {
            let value = await self.fetchToken()
            DispatchQueue.main.async {
                completion(.success(value))
            }
        }
    }

    func blockingToken() -> String {
        let semaphore = DispatchSemaphore(value: 0)
        var result = ""
        Task {
            result = await fetchToken()
            semaphore.signal()
        }
        semaphore.wait()
        return result
    }

    private func fetchToken() async -> String {
        requestCount += 1
        return "token-\(requestCount)"
    }
}
