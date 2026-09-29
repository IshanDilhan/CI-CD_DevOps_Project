pipeline {
    agent any
    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }
    parameters {
        string(name: 'REGISTRY', defaultValue: 'localhost:5001', description: 'Registry host:port, no scheme. Local registry needs no credentials.')
        string(name: 'IMAGE_REPOSITORY', defaultValue: 'devops-todo', description: 'For Docker Hub use your-user/devops-todo.')
        string(name: 'REGISTRY_CREDENTIALS_ID', defaultValue: '', description: 'Optional Jenkins username/password credential ID.')
        string(name: 'DEPLOY_TAG', defaultValue: '', description: 'Empty builds a release; a known-good tag redeploys it for manual rollback.')
    }
    environment {
        DOCKER_CONFIG = "${WORKSPACE}/.local/docker-auth"
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    if (!(params.REGISTRY ==~ /[a-zA-Z0-9][a-zA-Z0-9.:-]*/)) { error('Invalid registry') }
                    if (!(params.IMAGE_REPOSITORY ==~ /[a-z0-9][a-z0-9._\/-]*/)) { error('Invalid repository') }
                    if (params.DEPLOY_TAG && !(params.DEPLOY_TAG ==~ /[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}/)) { error('Invalid tag') }
                    env.RELEASE_TAG = params.DEPLOY_TAG ?: "${BUILD_NUMBER}-${sh(script: 'git rev-parse --short=12 HEAD', returnStdout: true).trim()}"
                    env.APP_IMAGE = "${params.REGISTRY}/${params.IMAGE_REPOSITORY}:${env.RELEASE_TAG}"
                    env.REGISTRY = params.REGISTRY
                    env.LOCAL_IMAGE = "devops-todo-build:${BUILD_NUMBER}"
                }
                echo "Release image: ${env.APP_IMAGE}"
            }
        }
        stage('Install Dependencies') {
            when { expression { !params.DEPLOY_TAG } }
            steps {
                sh 'npm ci --prefix nodejs/server && npm ci --prefix react/client'
            }
        }
        stage('Test') {
            when { expression { !params.DEPLOY_TAG } }
            steps { sh 'npm test --prefix nodejs/server && npm test --prefix react/client' }
        }
        stage('Build') {
            when { expression { !params.DEPLOY_TAG } }
            steps { sh 'npm run build --prefix react/client' }
        }
        stage('Docker Build') {
            when { expression { !params.DEPLOY_TAG } }
            steps { sh 'docker build -t "$LOCAL_IMAGE" .' }
        }
        stage('Docker Tag') {
            when { expression { !params.DEPLOY_TAG } }
            steps { sh 'docker tag "$LOCAL_IMAGE" "$APP_IMAGE"' }
        }
        stage('Registry Login') {
            steps {
                sh 'mkdir -p "$DOCKER_CONFIG" && chmod 700 "$DOCKER_CONFIG"'
                script {
                    if (params.REGISTRY_CREDENTIALS_ID) {
                        withCredentials([usernamePassword(credentialsId: params.REGISTRY_CREDENTIALS_ID, usernameVariable: 'REGISTRY_USER', passwordVariable: 'REGISTRY_PASSWORD')]) {
                            sh '''
                                set +x
                                printf '%s' "$REGISTRY_PASSWORD" | docker login "$REGISTRY" --username "$REGISTRY_USER" --password-stdin
                            '''
                        }
                    } else {
                        echo 'Using unauthenticated registry (local lab only).'
                    }
                }
            }
        }
        stage('Docker Push') {
            when { expression { !params.DEPLOY_TAG } }
            steps { sh 'docker push "$APP_IMAGE"' }
        }
        stage('Deploy with Ansible') {
            steps {
                withCredentials([string(credentialsId: 'todo-db-password', variable: 'DB_PASSWORD')]) {
                    sh 'ansible-playbook --syntax-check ansible/deploy.yml'
                    sh 'ansible-playbook ansible/deploy.yml'
                }
            }
        }
        stage('Health Check') {
            steps {
                sh 'curl --fail --silent --show-error --retry 5 --retry-delay 3 http://todo-app:5000/health'
                sh 'APP_URL=http://todo-app:5000 node scripts/smoke.mjs'
                writeFile file: 'release.txt', text: "${env.APP_IMAGE}\n"
                archiveArtifacts artifacts: 'release.txt', fingerprint: true
            }
        }
    }
    post {
        always {
            sh 'rm -f "$DOCKER_CONFIG/config.json"'
        }
        failure {
            echo 'Release failed. Inspect logs; redeploy the previous successful release tag if deployment had started. Rollback is manual.'
        }
    }
}
