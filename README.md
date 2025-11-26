# CI/CD Pipeline for Full-Stack Application

This project outlines a comprehensive DevOps solution for deploying a full-stack web application, comprising PostgreSQL, NodeJS, and React components, onto AWS Cloud infrastructure using a Jenkins-driven CI/CD pipeline. The core objective is to automate the entire application lifecycle, from infrastructure provisioning to application deployment and management.

## Project Overview

The architecture leverages a Jenkins server acting as both the CI/CD orchestrator and an Ansible control node. The application components (PostgreSQL, NodeJS, React) are deployed as Docker containers on three separate EC2 instances, which serve as managed nodes.

### Key Technologies and Concepts Covered:

*   **Jenkins Pipeline:** Orchestrating the entire CI/CD workflow, including infrastructure creation, Docker image building, pushing to ECR, and application deployment.
*   **Terraform:** Infrastructure as Code (IaC) for provisioning AWS resources such as EC2 instances, S3 buckets for backend state, IAM roles and policies, and security groups.
*   **Ansible:** Configuration management and application deployment on EC2 instances, including Docker installation and container orchestration. Utilizes dynamic inventory for AWS EC2 instances.
*   **Docker:** Containerization of the PostgreSQL database, NodeJS backend, and React frontend for consistent environments and simplified deployment.
*   **AWS ECR (Elastic Container Registry):** Secure storage and management of Docker images.
*   **AWS IAM (Identity and Access Management):** Defining roles and policies for secure access to AWS resources.
*   **AWS EC2:** Virtual servers hosting the Jenkins server and application components.
*   **AWS S3:** Used for Terraform remote state management, ensuring collaborative and consistent infrastructure deployments.
*   **AWS Systems Manager Parameter Store (SSM):** Secure storage and retrieval of sensitive application parameters like database credentials.
*   **GitHub:** Version control for all project code and configuration files, integrated with Jenkins for triggering pipelines.

## Architecture and Workflow

1.  **Infrastructure Provisioning (Terraform):**
    *   A dedicated Terraform project (`create-jenkins-server/install-jenkins.tf`) provisions the Jenkins server on AWS. This server also acts as the Ansible control node.
    *   Another Terraform configuration (`main.tf`) sets up three EC2 instances to host the PostgreSQL, NodeJS, and React Docker containers, along with necessary security groups and IAM roles.
    *   Terraform state is managed remotely in an S3 bucket for collaboration and state locking.

2.  **Jenkins Pipeline Configuration (`Jenkinsfile`):**
    *   The `Jenkinsfile` defines a declarative pipeline with several stages:
        *   **Create Infrastructure for the App:** Executes `terraform init` and `terraform apply` to provision the application's AWS infrastructure.
        *   **Create ECR Repo:** Ensures an ECR repository exists for Docker images, creating one if it doesn't.
        *   **Build App Docker Image:** Builds Docker images for PostgreSQL, NodeJS, and React components on the Jenkins server. It also dynamically injects environment variables (like database host and password from SSM Parameter Store) into the application's `.env` files.
        *   **Push Image to ECR Repo:** Authenticates with ECR and pushes the built Docker images to the ECR repository.
        *   **Wait for the Instance:** Waits for the provisioned EC2 instances to be in a running state and pass status checks before proceeding.
        *   **Deploy the App:** Executes an Ansible playbook (`docker-project.yml`) to deploy the Docker containers on the respective EC2 instances.
        *   **Destroy the infrastructure:** A controlled destruction of all AWS resources created by Terraform, triggered by user approval. This also cleans up Docker images and ECR repositories.
    *   **Post-Actions:** Includes steps for cleaning up local Docker images on the Jenkins server and destroying infrastructure/ECR repositories in case of pipeline failures.

3.  **Ansible Deployment (`docker-project.yml`):**
    *   An Ansible playbook automates the installation of Docker on all managed nodes.
    *   It then logs into AWS ECR, pulls the appropriate Docker images, and launches the PostgreSQL, NodeJS, and React containers on their designated EC2 instances.
    *   Dynamic inventory (`inventory_aws_ec2.yml`) is used to discover and manage AWS EC2 instances.

## Setup and Execution

### Initial Setup (Jenkins Server and GitHub Repository)

1.  **Provision Jenkins Server:**
    *   Navigate to the `create-jenkins-server` directory.
    *   Ensure your `.pem` key file is in this directory.
    *   Run `terraform init` and `terraform apply --auto-approve` to deploy the Jenkins server and associated AWS resources (S3 backend, GitHub repository).
2.  **Clone Project Repository:**
    *   Create a working directory for your project.
    *   Clone the private GitHub repository created by Terraform into your working directory.
    *   Copy the application code (`nodejs`, `react`, `postgresql` directories), `Jenkinsfile`, `docker-project.yml`, `ansible.cfg`, `inventory_aws_ec2.yml`, `node-env-template`, and `react-env-template` into the cloned repository.

### Jenkins Configuration

1.  **Access Jenkins Dashboard:** Open `http://<JENKINS-SERVER-PUBLIC-IP>:8080` in your browser.
2.  **Retrieve Admin Password:** SSH into the Jenkins server and run `sudo cat /var/lib/jenkins/secrets/initialAdminPassword`.
3.  **Install Plugins:** In `Manage Jenkins > Plugins`, install "Ansible" and "Terraform" plugins.
4.  **Configure Tools:** In `Manage Jenkins > Tools`:
    *   **Ansible Installation:** Name: `ansible`, Path: `/usr/bin/` (verify with `which ansible` on Jenkins server).
    *   **Terraform Installation:** Name: `terraform`, Path: `/usr/local/bin/` (verify with `which terraform` on Jenkins server).
5.  **Configure Credentials:** In `Manage Jenkins > Credentials > Global > Add Credentials`:
    *   **GitHub Token:** Kind: `Username with password`. Username: `<YOUR-GITHUB-USERNAME>`, Password: `<YOUR-GITHUB-TOKEN>`.
    *   **AWS SSH Key:** Kind: `SSH Username with private key`. ID: `<YOUR-KEY-PEM-NAME>`, Description: `ansible`, Username: `ec2-user`, Private Key: Enter the content of your `<YOUR-KEY-PEM>` file.
6.  **Configure AWS SSM Parameter Store:**
    *   Go to `AWS Management Console > Systems Manager > Parameter Store`.
    *   Create parameters:
        *   Name: `db_name`, Value: `dbtodo`
        *   Name: `db_password`, Value: `<YOUR-DB-PASSWORD>`

### Prepare Automation Files (Terraform, Ansible, Jenkins)

The following files contain sensitive information that needs to be replaced with your specific values or masked with placeholders as indicated in the task. These modifications have already been applied to the code in this project, replacing actual values with `<YOUR-...>` placeholders.

*   `main.tf`
*   `create-jenkins-server/install-jenkins.tf`
*   `create-jenkins-server/variables.tf`
*   `Jenkinsfile`
*   `inventory_aws_ec2.yml`
*   `nodejs/server/.env`
*   `react/client/.env`

### Push to GitHub

Commit and push all project files (after making necessary sensitive information replacements) to your GitHub repository.

```bash
git add .
git commit -m "Initial project setup and CI/CD pipeline"
git push
```

### Create Jenkins Pipeline

1.  **New Jenkins Item:** From the Jenkins Dashboard, click `New Item`.
2.  **Configure Pipeline:**
    *   Enter a name (e.g., `todo-app-pipeline`).
    *   Select `Pipeline` as the type.
    *   In the Pipeline section, choose `Pipeline script from SCM`.
    *   SCM: `Git`.
    *   Repository URL: `<YOUR-GITHUB-REPO-URL>`.
    *   Credentials: Select the GitHub credential you created earlier.
    *   Script Path: `Jenkinsfile`.
3.  **Save and Build:** Save the pipeline configuration and click `Build Now` to initiate the CI/CD process. Monitor the pipeline stages for progress and any issues.

## Post-Deployment

*   Upon successful deployment, you should be able to access the React frontend at `http://<REACT-SERVER-PUBLIC-IP>:3000`.
*   **Cleanup:** After completing your work, remember to destroy all provisioned AWS resources using the `create-jenkins-server` Terraform project to avoid unnecessary costs.
    *   Initiate the "Destroy the infrastructure" stage in your Jenkins pipeline.
    *   Alternatively, navigate to `create-jenkins-server` and run `terraform destroy --auto-approve`.

## Troubleshooting

*   **Jenkins Server Disk Space:** If Jenkins becomes unresponsive due to full disk space, SSH into the server and run the following commands to free up space:

    ```bash
    df -h                                  # Check disk usage
    sudo docker system prune -a --volumes -f # Clear all Docker data
    cd /var/lib/jenkins/workspace          # Navigate to Jenkins workspace
    sudo rm -rf *                          # Clear Jenkins workspace content
    sudo sync; echo 3 | sudo tee /proc/sys/vm/drop_caches # Clear cache
    ```
